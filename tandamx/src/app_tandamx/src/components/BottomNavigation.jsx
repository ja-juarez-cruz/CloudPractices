// src/components/BottomNavigation.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, CreditCard, Settings } from 'lucide-react';

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Resumen', icon: Calendar },
    { id: 'participantes', path: '/participantes', label: 'Participantes', icon: Users },
    { id: 'pagos', path: '/pagos', label: 'Pagos', icon: CreditCard },
    { id: 'configuracion', path: '/configuracion', label: 'Config', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40 safe-bottom">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                  active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {/* Indicador superior */}
                {active && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 rounded-b-full"></div>
                )}
                
                {/* Ícono con efecto */}
                <div className={`relative ${active ? 'transform -translate-y-1' : ''}`}>
                  <Icon className={`w-6 h-6 transition-all ${
                    active ? 'scale-110' : ''
                  }`} />
                  
                  {/* Badge de notificación (opcional) */}
                  {item.id === 'pagos' && active && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </div>
                
                {/* Label */}
                <span className={`text-xs mt-1 font-medium ${
                  active ? 'font-bold' : ''
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}