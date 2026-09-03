import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin } from "lucide-react";
import { BUKAVU_LOCATIONS, BukavuLocation } from "../locations";

interface AvenueSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectLocation: (location: BukavuLocation) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function AvenueSelector({
  value,
  onChange,
  onSelectLocation,
  label = "Avenue *",
  placeholder = "Saisissez ou recherchez l'avenue...",
  required = false
}: AvenueSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search term with external value prop
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Handle click outside to close the autocomplete suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLocations = BUKAVU_LOCATIONS.filter((loc) =>
    loc.avenue.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.quartier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.commune.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    setIsOpen(true);

    // If there is an exact match in the locations, trigger auto-select
    const exactMatch = BUKAVU_LOCATIONS.find(
      (loc) => loc.avenue.toLowerCase() === val.trim().toLowerCase()
    );
    if (exactMatch) {
      onSelectLocation(exactMatch);
    }
  };

  const handleSelect = (loc: BukavuLocation) => {
    setSearchTerm(loc.avenue);
    onChange(loc.avenue);
    onSelectLocation(loc);
    setIsOpen(false);
  };

  // Find if current value matches any of the locations to display resolved details
  const matchedLocation = BUKAVU_LOCATIONS.find(
    (loc) => value.toLowerCase().includes(loc.avenue.toLowerCase()) || loc.avenue.toLowerCase() === value.trim().toLowerCase()
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          required={required}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm/30"
        />
        <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
      </div>

      {/* Auto-suggest dropdown */}
      {isOpen && filteredLocations.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
          {filteredLocations.map((loc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(loc)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-emerald-500" />
                <span className="font-semibold text-slate-700">{loc.avenue}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  Q. {loc.quartier}
                </span>
                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  C. {loc.commune}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Auto-populated visual indicator */}
      {matchedLocation && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 animate-fadeIn">
          <span className="text-[10px] text-slate-400 font-medium">Auto-détecté :</span>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200/50">
            Quartier: {matchedLocation.quartier}
          </span>
          <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100">
            Commune: {matchedLocation.commune}
          </span>
        </div>
      )}
    </div>
  );
}
