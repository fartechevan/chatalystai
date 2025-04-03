
interface MessageSourceProps {
  icon: string;
  label: string;
  count: number;
}

function MessageSource({ icon, label, count }: MessageSourceProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-white/90">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-green-400 text-sm">{count}</span>
    </div>
  );
}

interface MessagesSectionProps {
  className?: string;
  messages?: any[];
}

export function MessagesSection({ className = "", messages = [] }: MessagesSectionProps) {
  // Group messages by source
  const telegramMessages = messages.filter(msg => msg.source === 'telegram').length;
  const whatsappMessages = messages.filter(msg => msg.source === 'whatsapp').length;
  const livechatMessages = messages.filter(msg => msg.source === 'livechat').length;
  const otherMessages = messages.filter(msg => 
    !msg.source || !['telegram', 'whatsapp', 'livechat'].includes(msg.source)
  ).length;
  
  // Total messages count
  const totalMessages = messages.length;
  
  return (
    <div className={`rounded-lg bg-blue-950/80 p-4 flex flex-col h-full ${className}`}>
      <div className="font-semibold text-xs uppercase tracking-wide text-white/70 mb-2">
        INCOMING MESSAGES
      </div>
      <div className="text-4xl font-bold text-green-400 my-1">
        {totalMessages}
      </div>
      <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
        <span className="text-white/50 text-xs">this month</span>
      </div>
      <div className="h-px bg-white/10 my-3"></div>
      <div className="space-y-1 flex-1">
        <MessageSource icon="📱" label="Telegram" count={telegramMessages} />
        <MessageSource icon="📱" label="WhatsApp Lite" count={whatsappMessages} />
        <MessageSource icon="💬" label="Live chat" count={livechatMessages} />
        <MessageSource icon="❓" label="Other" count={otherMessages} />
      </div>
    </div>
  );
}
