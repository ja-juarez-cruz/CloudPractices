provider "aws" {
  region = var.region
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

locals {
  region     = var.region
  vpc_id     = data.aws_vpc.default.id
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "ecsTaskRoleApiCitas"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonElasticFileSystemClientFullAccess"
}


resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/api-citas"
  retention_in_days = 1
}


resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_efs_file_system" "api_citas" {
  creation_token = "api-citas-efs"
  lifecycle_policy {
    transition_to_ia = "AFTER_7_DAYS"
  }
  tags = {
    Name = "api-citas-efs"
  }
}

resource "aws_efs_access_point" "api_citas" {
  file_system_id = aws_efs_file_system.api_citas.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/sqlite"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "0755"
    }
  }
}


resource "aws_ecs_cluster" "this" {
  name = "api-citas-cluster"
}

resource "aws_ecs_task_definition" "this" {
  family                   = "api-citas"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.ecr_image
      portMappings = [{
        containerPort = 80
      }],
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/api-citas"
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  volume {
    name = "efs-volume"
    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.api_citas.id
      transit_encryption      = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.api_citas.id
        iam             = "ENABLED"
      }
    }
  }
}

resource "aws_security_group" "ecs_sg" {
  name        = "ecs-api-sg"
  description = "Allow HTTP"
  vpc_id      = local.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "efs_sg" {
  name        = "efs-sg"
  description = "Permitir acceso NFS desde ECS"
  vpc_id      = local.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_lb" "this" {
  name               = "api-citas-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = local.subnet_ids
  security_groups    = [aws_security_group.ecs_sg.id]
}

resource "aws_lb_target_group" "this" {
  name     = "api-citas-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = local.vpc_id
  target_type = "ip"
}

resource "aws_lb_listener" "this" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

resource "aws_efs_mount_target" "this" {
  for_each        = toset(local.subnet_ids) # lista de subnets (una por AZ)
  file_system_id  = aws_efs_file_system.api_citas.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs_sg.id]
}


resource "aws_ecs_service" "this" {
  name            = "api-citas-service"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets         = local.subnet_ids
    assign_public_ip = true
    security_groups = [aws_security_group.ecs_sg.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "api"
    container_port   = 80
  }
}
