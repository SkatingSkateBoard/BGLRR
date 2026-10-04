export function ScrollableBox({
    className, children
}: { className?: string; children: React.ReactNode }) {
    return (
        <div className={`overflow-y-auto ${className ?? ""} rounded-[2vw] md:rounded-md border-gray-150 px-2 text-[15px]`}>
            {children}
        </div>
    );
}