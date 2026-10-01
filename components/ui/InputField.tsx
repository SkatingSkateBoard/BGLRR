"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

export function InputField({
    id, name, placeholder, className, type = "", value, onChange, error, hideErrorText = false,
}: {
    id: string
    name: string
    placeholder: string
    className?: string
    type?: string
    value?: string
    onChange?: (value: string) => void
    error?: string
    hideErrorText?: boolean
}) {
    const [showPassword, setShowPassword] = React.useState(false)
    const isPassword = type === "password"
    const inputType = isPassword ? (showPassword ? "text" : "password") : (type || "text")
    const inputClass =
        "text-[12px] h-13 border-1 min-w-0 pl-3 border-gray-150 rounded-[2vw] md:rounded-md focus:outline-hidden"

    return (
        <div className={className}>
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    type={inputType}
                    placeholder=" "
                    value={value ?? ""}
                    onChange={(e) => onChange?.(e.target.value)}
                    className={`${inputClass} peer w-full text-[17px] pt-4 ${isPassword ? "pr-10" : ""} ${error ? "border-red-500" : ""}`}
                />
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

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && !hideErrorText && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
    )
}