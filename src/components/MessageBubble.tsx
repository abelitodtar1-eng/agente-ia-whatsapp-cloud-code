interface MessageBubbleProps {
  role: "user" | "assistant" | "human";
  content: string;
  createdAt: number;
}

export function MessageBubble({ role, content, createdAt }: MessageBubbleProps) {
  const time = new Date(createdAt * 1000).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (role === "user") {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[75%]">
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-1">{time}</p>
        </div>
      </div>
    );
  }

  if (role === "assistant") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%]">
          <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm text-white whitespace-pre-wrap">{content}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1 mr-1 text-right">IA · {time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[75%]">
        <div className="bg-amber-400 rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{content}</p>
        </div>
        <p className="text-xs text-gray-400 mt-1 mr-1 text-right">Tú · {time}</p>
      </div>
    </div>
  );
}
