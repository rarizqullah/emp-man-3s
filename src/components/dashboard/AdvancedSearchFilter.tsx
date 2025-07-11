"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Calendar,
  Download,
  X,
  ChevronDown,
  Users,
  Building2,
  MapPin,
  Clock,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

// Filter Types and Interfaces
export interface FilterCriteria {
  searchTerm?: string
  departments?: string[]
  positions?: string[]
  shifts?: string[]
  status?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  customFilters?: Record<string, any>
}

export interface SearchSuggestion {
  id: string
  label: string
  category: 'employee' | 'department' | 'position' | 'recent'
  value: string
}

interface AdvancedSearchFilterProps {
  onSearch: (criteria: FilterCriteria) => void
  onExport?: (criteria: FilterCriteria) => void
  suggestions?: SearchSuggestion[]
  departments?: Array<{ id: string; name: string }>
  positions?: Array<{ id: string; name: string }>
  shifts?: Array<{ id: string; name: string }>
  statusOptions?: Array<{ id: string; name: string; color?: string }>
  loading?: boolean
  placeholder?: string
  showExport?: boolean
  showDateRange?: boolean
  showAdvancedFilters?: boolean
}

// Autocomplete Search Component
const AutocompleteSearch: React.FC<{
  value: string
  onChange: (value: string) => void
  suggestions: SearchSuggestion[]
  placeholder: string
}> = ({ value, onChange, suggestions, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([])

  useEffect(() => {
    if (value.length > 0) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.label.toLowerCase().includes(value.toLowerCase()) ||
        suggestion.value.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSuggestions(filtered.slice(0, 8)) // Limit to 8 suggestions
    } else {
      setFilteredSuggestions([])
    }
  }, [value, suggestions])

  const groupedSuggestions = useMemo(() => {
    return filteredSuggestions.reduce((groups, suggestion) => {
      const category = suggestion.category
      if (!groups[category]) groups[category] = []
      groups[category].push(suggestion)
      return groups
    }, {} as Record<string, SearchSuggestion[]>)
  }, [filteredSuggestions])

  const categoryLabels = {
    employee: 'Karyawan',
    department: 'Departemen',
    position: 'Jabatan',
    recent: 'Pencarian Terakhir'
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="pl-10 pr-4"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandEmpty>Tidak ada hasil ditemukan</CommandEmpty>
          {Object.entries(groupedSuggestions).map(([category, items]) => (
            <CommandGroup key={category} heading={categoryLabels[category as keyof typeof categoryLabels]}>
              {items.map((suggestion) => (
                <CommandItem
                  key={suggestion.id}
                  onSelect={() => {
                    onChange(suggestion.value)
                    setIsOpen(false)
                  }}
                >
                  <span>{suggestion.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Multi-Select Component
const MultiSelect: React.FC<{
  options: Array<{ id: string; name: string }>
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  icon?: React.ComponentType<{ className?: string }>
}> = ({ options, value, onChange, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOption = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter(id => id !== optionId))
    } else {
      onChange([...value, optionId])
    }
  }

  const selectedLabels = options
    .filter(option => value.includes(option.id))
    .map(option => option.name)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          role="combobox"
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            <span className="truncate">
              {value.length === 0
                ? placeholder
                : value.length === 1
                ? selectedLabels[0]
                : `${value.length} dipilih`
              }
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="p-2 space-y-2">
          {options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={option.id}
                checked={value.includes(option.id)}
                onCheckedChange={() => toggleOption(option.id)}
              />
              <Label htmlFor={option.id} className="text-sm font-normal">
                {option.name}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Date Range Picker Component
const DateRangePicker: React.FC<{
  value?: { from: Date; to: Date }
  onChange: (range?: { from: Date; to: Date }) => void
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Calendar className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "dd MMM", { locale: id })} -{" "}
                {format(value.to, "dd MMM", { locale: id })}
              </>
            ) : (
              format(value.from, "dd MMM", { locale: id })
            )
          ) : (
            <span>Pilih tanggal</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange as any}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

// Main Advanced Search Filter Component
export const AdvancedSearchFilter: React.FC<AdvancedSearchFilterProps> = ({
  onSearch,
  onExport,
  suggestions = [],
  departments = [],
  positions = [],
  shifts = [],
  statusOptions = [],
  loading = false,
  placeholder = "Cari karyawan, departemen, atau jabatan...",
  showExport = true,
  showDateRange = true,
  showAdvancedFilters = true,
}) => {
  const [criteria, setCriteria] = useState<FilterCriteria>({})
  const [showFilters, setShowFilters] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Update active filters count
  useEffect(() => {
    const count = Object.entries(criteria).reduce((acc, [key, value]) => {
      if (key === 'searchTerm' && value) return acc + 1
      if (Array.isArray(value) && value.length > 0) return acc + 1
      if (key === 'dateRange' && value) return acc + 1
      return acc
    }, 0)
    setActiveFiltersCount(count)
  }, [criteria])

  const updateCriteria = (key: keyof FilterCriteria, value: any) => {
    setCriteria(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    onSearch(criteria)
  }

  const handleExport = () => {
    if (onExport) {
      onExport(criteria)
    }
  }

  const clearFilters = () => {
    setCriteria({})
    onSearch({})
  }

  const clearSpecificFilter = (key: keyof FilterCriteria) => {
    const newCriteria = { ...criteria }
    delete newCriteria[key]
    setCriteria(newCriteria)
    onSearch(newCriteria)
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Pencarian & Filter</CardTitle>
            <CardDescription>
              Cari dan filter data dengan kriteria yang spesifik
            </CardDescription>
          </div>
          {showAdvancedFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filter Lanjutan
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Search */}
        <div className="flex gap-2">
          <div className="flex-1">
            <AutocompleteSearch
              value={criteria.searchTerm || ''}
              onChange={(value) => updateCriteria('searchTerm', value)}
              suggestions={suggestions}
              placeholder={placeholder}
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          {showExport && onExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium">Filter aktif:</span>
            {criteria.searchTerm && (
              <Badge variant="secondary" className="gap-1">
                {criteria.searchTerm}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearSpecificFilter('searchTerm')}
                />
              </Badge>
            )}
            {criteria.departments && criteria.departments.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                Departemen ({criteria.departments.length})
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearSpecificFilter('departments')}
                />
              </Badge>
            )}
            {criteria.positions && criteria.positions.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                Jabatan ({criteria.positions.length})
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearSpecificFilter('positions')}
                />
              </Badge>
            )}
            {criteria.dateRange && (
              <Badge variant="secondary" className="gap-1">
                Tanggal
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearSpecificFilter('dateRange')}
                />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Hapus Semua
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Department Filter */}
                {departments.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Departemen</Label>
                    <MultiSelect
                      options={departments}
                      value={criteria.departments || []}
                      onChange={(value) => updateCriteria('departments', value)}
                      placeholder="Pilih departemen"
                      icon={Building2}
                    />
                  </div>
                )}

                {/* Position Filter */}
                {positions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Jabatan</Label>
                    <MultiSelect
                      options={positions}
                      value={criteria.positions || []}
                      onChange={(value) => updateCriteria('positions', value)}
                      placeholder="Pilih jabatan"
                      icon={Users}
                    />
                  </div>
                )}

                {/* Shift Filter */}
                {shifts.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Shift</Label>
                    <MultiSelect
                      options={shifts}
                      value={criteria.shifts || []}
                      onChange={(value) => updateCriteria('shifts', value)}
                      placeholder="Pilih shift"
                      icon={Clock}
                    />
                  </div>
                )}

                {/* Status Filter */}
                {statusOptions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Status</Label>
                    <MultiSelect
                      options={statusOptions}
                      value={criteria.status || []}
                      onChange={(value) => updateCriteria('status', value)}
                      placeholder="Pilih status"
                    />
                  </div>
                )}

                {/* Date Range */}
                {showDateRange && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Rentang Tanggal</Label>
                    <DateRangePicker
                      value={criteria.dateRange}
                      onChange={(range) => updateCriteria('dateRange', range)}
                    />
                  </div>
                )}
              </div>

              {/* Apply Filters Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowFilters(false)}>
                  Tutup
                </Button>
                <Button onClick={handleSearch} disabled={loading}>
                  Terapkan Filter
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default AdvancedSearchFilter 