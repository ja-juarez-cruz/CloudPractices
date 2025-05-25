from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)
DB = '/mnt/sqlite/database.db'

def init_db():
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reservas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            fecha TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/reservas', methods=['GET'])
def get_reservas():
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reservas")
    rows = cursor.fetchall()
    conn.close()
    return jsonify(rows)

@app.route('/reservas', methods=['POST'])
def crear_reserva():
    data = request.get_json()
    nombre = data.get('nombre')
    fecha = data.get('fecha')
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO reservas (nombre, fecha) VALUES (?, ?)", (nombre, fecha))
    conn.commit()
    conn.close()
    return jsonify({"mensaje": "Reserva creada"}), 201

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=80)
