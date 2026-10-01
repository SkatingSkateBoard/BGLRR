"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

interface DropdownFieldProps {
    id: string
    name: string
    placeholder: string
    options: string[]
    value?: string
    defaultValue?: string
    className?: string
    onChange?: (value: string) => void
    error?: string
    hideErrorText?: boolean
}

export function DropdownField({ id, name, placeholder, options, className, value, defaultValue = "", onChange, error, hideErrorText = false }: DropdownFieldProps) {

    const inputClass =
        "text-[12px] h-13 border-1 min-w-0 pl-3 border-gray-150 rounded-[2vw] md:rounded-md focus:outline-hidden"

    return (
        <div className={className}>
            <div className="relative">
                <select
                    id={id}
                    name={name}
                    required
                    value={value}
                    defaultValue={value === undefined ? defaultValue : undefined}
                    onChange={(e) => onChange?.(e.target.value)}
                    className={`${inputClass} peer w-full text-[17px] pt-4 pr-8 appearance-none bg-white truncate font-sans ${error ? "border-red-500" : ""}`}
                >
                    <option value="" disabled hidden></option>
                    {options.map((opt) => (
                        <option key={opt} value={opt} className="font-sans">{opt}</option>
                    ))}
                </select>

                <label
                    htmlFor={id}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm
    transition-all pointer-events-none bg-white
    peer-focus:top-0 peer-focus:translate-y-1 peer-focus:text-xs
    peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:translate-y-1
    peer-not-placeholder-shown:text-xs ${error ? "text-red-500" : "text-gray-400 peer-focus:text-gray-400 peer-not-placeholder-shown:text-gray-400"}`}
                >
                    {placeholder}
                </label>

                <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
            </div>
            {error && !hideErrorText && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
    )
}