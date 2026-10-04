export function Checkbox({
    id, name, label, className, checked = false, onChange, error, hideErrorText = false,
}: { id: string; name: string; label: string; className?: string; checked?: boolean; onChange?: (checked: boolean) => void; error?: string; hideErrorText?: boolean }) {
    return (
        <div className={className}>
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id={id}
                    name={name}
                    checked={checked}
                    onChange={(e) => onChange && onChange(e.target.checked)}
                    className={`form-checkbox h-4 w-4 focus:ring-blue-500 rounded ${error ? "border-red-500 text-red-600" : "border-gray-300 text-blue-600"}`}
                />
                <label htmlFor={id} className={`ml-2 block text-sm ${error ? "text-red-500" : "text-gray-700"}`}>
                    {label}
                </label>
            </div>
            {error && !hideErrorText && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
    )
}