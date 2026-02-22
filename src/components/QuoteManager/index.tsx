// ============================================================
// src/components/QuoteManager/index.tsx
// VERSIÓN MODULAR Y LIMPIA
// ============================================================
import React, { useState } from 'react';
import QuoteList from './components/QuoteList';
import QuoteForm from './components/QuoteForm';

interface QuoteManagerProps {
  quotes: any[];
  catalogs: { 
      materiales?: any[]; materials?: any[]; 
      clientes?: any[]; clients?: any[]; 
      rules?: any[] 
  };
  onSave: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  dark: boolean;
}

const QuoteManager: React.FC<QuoteManagerProps> = ({ 
  quotes, catalogs, onSave, onDelete, onStatusChange, dark 
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingQuote, setEditingQuote] = useState<any>(null);

  const materialesList = catalogs.materiales || catalogs.materials || [];
  const clientesList = catalogs.clientes || catalogs.clients || [];

  // Handlers
  const handleNew = () => {
    setEditingQuote(null);
    setViewMode('form');
  };

  const handleEdit = (quote: any) => {
    setEditingQuote(quote);
    setViewMode('form');
  };

  const handleSave = async (data: any) => {
    await onSave(data);
    setViewMode('list');
  };

  const handleCancel = () => {
    setEditingQuote(null);
    setViewMode('list');
  };

  if (viewMode === 'form') {
    return (
      <QuoteForm 
        initialData={editingQuote} 
        onSave={handleSave} 
        onCancel={handleCancel} 
        catalogs={{ materiales: materialesList, clientes: clientesList }}
        dark={dark} 
      />
    );
  }

  return (
    <QuoteList 
      quotes={quotes} 
      onNew={handleNew} 
      onEdit={handleEdit} 
      onDelete={onDelete} 
      onStatusChange={onStatusChange}
      materials={materialesList}
      dark={dark} 
    />
  );
};

export default QuoteManager;