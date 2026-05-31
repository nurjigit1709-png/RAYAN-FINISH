import { useState, useEffect, useRef } from "react";
import { useListConversations, useListMessages, useSendMessage, useListFiles, getListConversationsQueryKey, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Download, X, Search, ArrowLeft, MessageCircle } from "lucide-react";
import { cn, formatDate, formatBytes, getFileIconEmoji, downloadFile } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [attachFile, setAttachFile] = useState<any>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [convSearch, setConvSearch] = useState("");
  // Mobile: show conversation list (true) or messages (false)
  const [showConvList, setShowConvList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useListConversations({ query: { refetchInterval: 5000 } }) as any;
  const { data: messages = [] } = useListMessages(
    { userId: selectedUserId! },
    { query: { enabled: !!selectedUserId, refetchInterval: 3000, queryKey: getListMessagesQueryKey({ userId: selectedUserId! }) } }
  ) as any;
  const { data: allFiles = [] } = useListFiles({}) as any;
  const sendMessage = useSendMessage();

  const selectedConv = (conversations as any[]).find((c: any) => c.userId === selectedUserId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId);
    setShowConvList(false); // on mobile, switch to messages view
  };

  const handleBack = () => {
    setShowConvList(true);
    setSelectedUserId(null);
  };

  const handleSend = async () => {
    if (!selectedUserId || (!message.trim() && !attachFile)) return;
    await sendMessage.mutateAsync({
      data: {
        receiverId: selectedUserId,
        content: message.trim() || null,
        fileId: attachFile?.id ?? null,
      }
    });
    setMessage("");
    setAttachFile(null);
    queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey({ userId: selectedUserId }) });
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownload = async (fileId: number, fileName: string) => {
    try { await downloadFile(fileId, fileName); }
    catch { toast({ title: "Ошибка скачивания", variant: "destructive" }); }
  };

  const filteredConvs = (conversations as any[]).filter((c: any) =>
    c.userName.toLowerCase().includes(convSearch.toLowerCase())
  );
  const filteredFiles = (allFiles as any[]).filter((f: any) =>
    f.name.toLowerCase().includes(fileSearch.toLowerCase())
  ).slice(0, 20);

  const getInitials = (name: string) =>
    name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") return "Админ";
    if (role === "manager") return "Менеджер";
    if (role === "programmer") return "Программист";
    return "Сотрудник";
  };

  // === Conversation List Panel ===
  const ConvList = (
    <div className={cn(
      "flex flex-col bg-card border-r border-border",
      // Desktop: fixed width; Mobile: full width, shown/hidden
      "md:w-72 md:flex-shrink-0",
      "w-full",
      selectedUserId && !showConvList ? "hidden md:flex" : "flex"
    )}>
      <div className="p-4 border-b border-border flex-shrink-0">
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Чат
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Поиск коллег..."
            value={convSearch}
            onChange={(e) => setConvSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredConvs.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Нет коллег</div>
        ) : (
          filteredConvs.map((conv: any) => (
            <button
              key={conv.userId}
              onClick={() => handleSelectUser(conv.userId)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50",
                selectedUserId === conv.userId && "bg-accent"
              )}
            >
              <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {getInitials(conv.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium text-foreground truncate">{conv.userName}</p>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">{getRoleBadge(conv.userRole)}</p>
                {conv.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                )}
                {conv.lastFileId && !conv.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">📎 Файл</p>
                )}
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );

  // === Messages Panel ===
  const MessagesPanel = selectedUserId ? (
    <div className={cn(
      "flex-1 flex flex-col min-w-0",
      // Mobile: show only when a conv is selected and list is hidden
      !showConvList || selectedUserId ? "flex" : "hidden md:flex",
      showConvList && "hidden md:flex"
    )}>
      {/* Chat header */}
      <div className="px-3 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        {/* Back button — mobile only */}
        <button
          onClick={handleBack}
          className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
            {selectedConv ? getInitials(selectedConv.userName) : "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-foreground">{selectedConv?.userName}</p>
          <p className="text-xs text-muted-foreground">{selectedConv && getRoleBadge(selectedConv.userRole)}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {(messages as any[]).length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">
              Начните общение с коллегой
            </div>
          )}
          {(messages as any[]).map((msg: any) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] sm:max-w-[70%] rounded-2xl px-3 py-2.5 space-y-1.5",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-accent text-foreground rounded-bl-sm"
                )}>
                  {msg.content && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  {msg.fileId && (
                    <div className={cn(
                      "flex items-center gap-2 rounded-lg p-2 cursor-pointer",
                      isMe ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-background/50 hover:bg-background/80"
                    )}
                      onClick={() => handleDownload(msg.fileId, msg.fileName)}
                    >
                      <span className="text-lg flex-shrink-0">{getFileIconEmoji(msg.fileMimeType || "")}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium truncate", isMe ? "text-primary-foreground" : "text-foreground")}>
                          {msg.fileName}
                        </p>
                        {msg.fileSize && (
                          <p className={cn("text-[10px]", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {formatBytes(msg.fileSize)}
                          </p>
                        )}
                      </div>
                      <Download className={cn("w-3.5 h-3.5 flex-shrink-0", isMe ? "text-primary-foreground/70" : "text-muted-foreground")} />
                    </div>
                  )}
                  <p className={cn("text-[10px]", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {formatDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Attached file preview */}
      {attachFile && (
        <div className="mx-3 mb-2 flex items-center gap-2 bg-accent/50 border border-border rounded-lg px-3 py-2 flex-shrink-0">
          <span className="text-lg">{getFileIconEmoji(attachFile.mimeType)}</span>
          <p className="text-sm flex-1 truncate text-foreground">{attachFile.name}</p>
          <button onClick={() => setAttachFile(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message input */}
      <div className="px-3 py-3 border-t border-border flex items-end gap-2 flex-shrink-0">
        <button
          onClick={() => setShowFilePicker(true)}
          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
          title="Прикрепить файл"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <Input
          placeholder="Написать сообщение..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-background border-border"
        />
        <Button
          onClick={handleSend}
          disabled={sendMessage.isPending || (!message.trim() && !attachFile)}
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  ) : (
    <div className={cn(
      "flex-1 flex-col items-center justify-center text-center gap-4 text-muted-foreground",
      showConvList ? "hidden md:flex" : "flex"
    )}>
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Send className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="font-medium text-foreground">Корпоративный чат</p>
        <p className="text-sm mt-1">Выберите коллегу, чтобы начать общение</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] flex rounded-xl overflow-hidden border border-border bg-card animate-fade-in">
        {ConvList}
        {MessagesPanel}
      </div>

      {/* File picker dialog */}
      <Dialog open={showFilePicker} onOpenChange={setShowFilePicker}>
        <DialogContent className="bg-card border-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary" />
              Прикрепить файл из архива
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск файлов..."
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {filteredFiles.map((file: any) => (
                <button
                  key={file.id}
                  onClick={() => { setAttachFile(file); setShowFilePicker(false); setFileSearch(""); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <span className="text-lg flex-shrink-0">{getFileIconEmoji(file.mimeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                </button>
              ))}
              {filteredFiles.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">Файлы не найдены</div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
