import { type LucideIcon } from "lucide-react";

type SectionId = "emergencies" | "residents" | "announcement" | "analytics" | "appointment" | "history" ;

export function SideBarItem({
    id, label, icon: Icon, selected, onSelect, itemClass,
}: {
    id: SectionId
    label: string
    icon: LucideIcon
    selected: SectionId
    onSelect: (id: SectionId) => void
    itemClass: string
}) {
    const isSelected = selected === id;
    return (
        <button
            type="button"
            onClick={() => onSelect(id)}
            className={`${itemClass} transition-colors duration-100 ${isSelected ? "bg-[rgb(35,35,184)] shadow-lg/30" : "bg-transparent"}`}
        >
            <Icon strokeWidth={2.5} size={20} className={`transition-colors duration-50 ${isSelected ? "text-white" : "text-gray-400"}`} />
            <p className={`font-normal ml-2 transition-colors duration-50 ${isSelected ? "text-white font-semibold" : "text-gray-400 font-normal"}`}>
                {label}
            </p>
        </button>
    );
}     
