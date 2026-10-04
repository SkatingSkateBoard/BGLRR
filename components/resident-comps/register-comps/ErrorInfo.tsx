import { CircleAlert } from "lucide-react";

export function ErrorBox({ message }: { message: string }) {
    return (
        <div className="flex flex-row items-center bg-white text-red-500 px-4 py-3 rounded relative shadow-lg" role="alert">
            <strong className="font-bold"> <CircleAlert className="inline-block mr-2" /> </strong>
            <span className="block sm:inline">{message}</span>
        </div>
    )
}