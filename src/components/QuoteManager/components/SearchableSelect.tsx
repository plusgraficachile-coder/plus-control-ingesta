import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Package, Users } from 'lucide-react';

const SearchableSelect = ({ value, options, onChange, placeholder, dark }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedItem = options.find((o:any) => String(o.id) === String(value));

    const filteredOptions = options.filter((o:any) => {
        const term = searchTerm.toLowerCase();
        const name = (o.nombre || o.empresa || '').toLowerCase();
        const code = (o.codigo || o.rut || '').toLowerCase();
        return name.includes(term) || code.includes(term);
    });

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                onClick={() => { setIsOpen(!isOpen); setSearchTerm(''); }}
                className={`w-full p-2.5 text-sm rounded-lg border cursor-pointer flex justify-between items-center transition-all ${
                    dark ? 'bg-slate-700 border-slate-600 text-white hover:border-cyan-500' : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-500'
                } ${isOpen ? 'ring-2 ring-cyan-500 border-cyan-500' : ''}`}
            >
                <span className={`truncate font-bold ${!selectedItem ? 'text-slate-400 italic font-normal' : ''}`}>
                    {selectedItem ? (selectedItem.nombre || selectedItem.empresa) : placeholder}
                </span>
                <ChevronDown size={16} className={`opacity-50 min-w-[16px] transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </div>

            {isOpen && (
                <div className={`absolute z-[9999] w-full mt-1 rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className={`p-2 border-b ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                            <input 
                                ref={inputRef}
                                type="text"
                                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none font-medium ${dark ? 'bg-slate-900 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800'}`}
                                placeholder="Escriba para filtrar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt: any) => (
                                <div 
                                    key={opt.id}
                                    onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                    className={`px-4 py-3 text-sm cursor-pointer border-b last:border-0 border-dashed transition-colors flex justify-between items-center ${
                                        dark ? 'border-slate-700 hover:bg-cyan-900/30 hover:text-cyan-400 text-slate-300' : 'border-slate-100 hover:bg-cyan-50 text-slate-600'
                                    } ${String(value) === String(opt.id) ? (dark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-50 text-cyan-700 font-bold') : ''}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold">{opt.nombre || opt.empresa}</span>
                                        {(opt.codigo || opt.rut) && (
                                            <span className="text-[10px] opacity-60 font-mono mt-0.5 flex items-center gap-1">
                                                {opt.rut ? <Users size={10}/> : <Package size={10}/>} 
                                                {opt.codigo || opt.rut}
                                            </span>
                                        )}
                                    </div>
                                    {String(value) === String(opt.id) && <Check size={16} className="text-cyan-500"/>}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-500 italic">No se encontraron resultados.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;