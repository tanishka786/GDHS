'use client';

import { AudioChat } from "@/components/audio-chat";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from '@/hooks/use-chat';
import { ChatAction } from '@/lib/types/chat';
import {
    Activity,
    Bot,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    FileDown,
    Hospital,
    Image as ImageIcon,
    MessageSquare,
    Mic,
    RotateCcw,
    Send,
    Settings,
    Trash2,
    Upload,
    User,
    Volume2
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ChatPage() {
    const [message, setMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showAgentPanel, setShowAgentPanel] = useState(true);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [autoPlay, setAutoPlay] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close agent panel on mobile by default
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setShowAgentPanel(false);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const {
        messages,
        isLoading,
        error,
        chatId,
        currentAnalysis,
        suggestions,
        sendMessage,
        sendMessageWithImage,
        startNewChat,
        clearChat,
        retryLastMessage,
        downloadReport,
        validateImageFile,
        createImagePreview,
        cleanupImagePreview
    } = useChat();

    const handleSendMessage = async () => {
        if (!message.trim() && !selectedImage) return;

        if (selectedImage) {
            await sendMessageWithImage(message || 'Please analyze this X-ray', selectedImage);
            handleClearImage();
        } else {
            await sendMessage(message);
        }
        
        setMessage('');
    };

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        setSelectedImage(file);
        const preview = createImagePreview(file);
        setImagePreview(preview);
    };

    const handleClearImage = () => {
        if (imagePreview) {
            cleanupImagePreview(imagePreview);
        }
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleActionClick = async (action: ChatAction) => {
        switch (action.type) {
            case 'generate_report':
                await sendMessage('Generate a detailed PDF report for my analysis');
                break;
            case 'find_hospitals':
                await sendMessage('Find orthopedic specialists near me');
                break;
            case 'ask_symptoms':
                await sendMessage('I would like to describe my symptoms');
                break;
            case 'second_opinion':
                await sendMessage('Can you provide a second analysis of my X-ray?');
                break;
            case 'upload_xray':
                fileInputRef.current?.click();
                break;
            case 'download_report':
                if (action.data?.report_id) {
                    await downloadReport(action.data.report_id, action.data.filename);
                } else {
                    alert('No report ID available for download');
                }
                break;
            case 'email_report':
                await sendMessage('Please email me the report');
                break;
            case 'share_report':
                if (action.data?.report_id) {
                    const shareUrl = `${window.location.origin}/api/reports/${action.data.report_id}/download`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        alert('Report share link copied to clipboard!');
                    }).catch(() => {
                        alert(`Share link: ${shareUrl}`);
                    });
                } else {
                    await sendMessage('Get shareable link for the report');
                }
                break;
            case 'new_analysis':
                await startNewChat();
                break;
            default:
                await sendMessage(action.label);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setMessage(suggestion);
    };

    return (
        <div className="flex h-screen w-full chat-gradient">
            {/* Main Chat Container */}
            <div className={`flex flex-col transition-all duration-300 ${showAgentPanel ? 'flex-[2]' : 'flex-1'}`}>
                {/* Modern Chat Header */}
                <div className="border-b bg-card/50 backdrop-blur-sm p-4 chat-card">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src="/ortho-logo.png" />
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        <Activity className="h-5 w-5" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute-bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold">OrthoAssist</h1>
                                <p className="text-sm text-muted-foreground">AI Medical Assistant</p>
                            </div>
                            {chatId && (
                                <Badge variant="outline" className="text-xs">
                                    {chatId.slice(0, 8)}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAgentPanel(!showAgentPanel)}
                                className="h-9 w-9 p-0 chat-button"
                                title={showAgentPanel ? "Hide Agent Panel" : "Show Agent Panel"}
                            >
                                {showAgentPanel ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={startNewChat}
                                disabled={isLoading}
                                className="chat-button"
                            >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                New
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <Alert className="m-4 border-destructive bg-destructive/5 chat-card">
                        <AlertDescription className="flex items-center justify-between">
                            <span>{error}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={retryLastMessage}
                                className="chat-button"
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Chat Messages */}
                <ScrollArea className="flex-1 p-6 chat-scroll chat-scrollbar">
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {messages.length === 0 && (
                            <div className="text-center py-16">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-6 shadow-lg">
                                    <Activity className="h-10 w-10 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-foreground">Welcome to OrthoAssist!</h3>
                                <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                    I'm your AI medical assistant specialized in X-ray analysis and orthopedic questions. 
                                    Upload an image or ask me anything to get started!
                                </p>
                                <div className="mt-8 flex flex-wrap justify-center gap-3">
                                    <Badge variant="outline" className="px-3 py-1">
                                        🔍 X-ray Analysis
                                    </Badge>
                                    <Badge variant="outline" className="px-3 py-1">
                                        🦴 Orthopedic Questions
                                    </Badge>
                                    <Badge variant="outline" className="px-3 py-1">
                                        🏥 Medical Guidance
                                    </Badge>
                                </div>
                            </div>
                        )}
                        
                        {messages.map((msg, index) => (
                            <div
                                key={msg.id}
                                className={`flex gap-4 message-bubble ${
                                    msg.type === 'user' 
                                        ? 'flex-row-reverse justify-start' 
                                        : 'flex-row justify-start'
                                }`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    <Avatar className="h-10 w-10 shadow-md border-2 border-background">
                                        {msg.type === 'user' ? (
                                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-medium">
                                                <User className="h-5 w-5" />
                                            </AvatarFallback>
                                        ) : (
                                            <AvatarFallback className="bg-gradient-to-br from-muted to-muted/80 text-foreground text-sm font-medium">
                                                <Bot className="h-5 w-5" />
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                </div>

                                {/* Message Content */}
                                <div className={`flex-1 max-w-[75%] ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                                    {/* Message Bubble */}
                                    <div
                                        className={`inline-block px-5 py-4 rounded-3xl shadow-sm border ${
                                            msg.type === 'user'
                                                ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-lg border-primary/20'
                                                : 'bg-card text-card-foreground rounded-bl-lg border-border/50'
                                        }`}
                                    >
                                        {msg.type === 'bot' ? (
                                            <MarkdownRenderer 
                                                content={msg.content}
                                                className="text-card-foreground"
                                            />
                                        ) : (
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                {msg.content}
                                            </div>
                                        )}
                                        
                                        {/* Images */}
                                        {msg.images && msg.images.length > 0 && (
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {msg.images.map((img, idx) => (
                                                    <div key={idx} className="relative group">
                                                        <img
                                                            src={img}
                                                            alt={`Analysis ${idx + 1}`}
                                                            className="rounded-2xl max-w-full h-auto border border-background/20 shadow-md transition-transform group-hover:scale-105"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-2xl transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Attachments */}
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                {msg.attachments.map((attachment, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-3 p-3 bg-background/20 backdrop-blur-sm rounded-xl border border-background/30 hover:bg-background/30 transition-colors"
                                                    >
                                                        <div className="p-2 bg-primary/10 rounded-lg">
                                                            <FileDown className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium truncate">{attachment.name}</div>
                                                            {attachment.size && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                const reportIdMatch = attachment.url.match(/\/reports\/([^\/]+)\/download/);
                                                                if (reportIdMatch) {
                                                                    downloadReport(reportIdMatch[1], attachment.name);
                                                                } else {
                                                                    window.open(attachment.url, '_blank');
                                                                }
                                                            }}
                                                            disabled={isLoading}
                                                            className="h-8 w-8 p-0 chat-button hover:bg-primary/10"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Actions */}
                                        {msg.actions && msg.actions.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {msg.actions.map((action, idx) => (
                                                    <Button
                                                        key={idx}
                                                        variant={msg.type === 'user' ? 'secondary' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handleActionClick(action)}
                                                        disabled={isLoading}
                                                        className="h-9 text-xs chat-button shadow-sm"
                                                    >
                                                        {action.type === 'generate_report' && <FileDown className="h-3 w-3 mr-2" />}
                                                        {action.type === 'find_hospitals' && <Hospital className="h-3 w-3 mr-2" />}
                                                        {action.type === 'upload_xray' && <ImageIcon className="h-3 w-3 mr-2" />}
                                                        {action.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Timestamp */}
                                    <div className={`text-xs text-muted-foreground mt-2 flex items-center gap-1 ${
                                        msg.type === 'user' ? 'justify-end' : 'justify-start'
                                    }`}>
                                        <Clock className="h-3 w-3" />
                                        <span>{new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    
                                    {/* Loading indicator */}
                                    {msg.isLoading && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                            <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                                            <span>Analyzing...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {/* Enhanced Typing Indicator */}
                        {isLoading && (
                            <div className="flex gap-4 message-bubble">
                                <div className="flex-shrink-0">
                                    <Avatar className="h-10 w-10 shadow-md border-2 border-background">
                                        <AvatarFallback className="bg-gradient-to-br from-muted to-muted/80 text-foreground text-sm font-medium">
                                            <Bot className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="bg-card border border-border/50 rounded-3xl rounded-bl-lg px-5 py-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="typing-dots">
                                            <div className="typing-dot"></div>
                                            <div className="typing-dot"></div>
                                            <div className="typing-dot"></div>
                                        </div>
                                        <span className="text-xs text-muted-foreground ml-2">OrthoAssist is typing...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Enhanced Input Area */}
                <div className="border-t bg-gradient-to-r from-card/90 to-card/95 backdrop-blur-sm p-6 shadow-lg">
                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="mb-4 relative inline-block group">
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Selected X-ray"
                                    className="max-w-32 max-h-32 rounded-2xl border-2 border-primary/30 shadow-lg"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-2xl transition-colors" />
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full shadow-md chat-button"
                                onClick={handleClearImage}
                            >
                                ×
                            </Button>
                            <div className="mt-2 text-xs text-muted-foreground text-center">
                                X-ray ready for analysis
                            </div>
                        </div>
                    )}

                    {/* Input Row */}
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 relative">
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={selectedImage ? "Describe your symptoms or ask questions about the X-ray..." : "Type your message or upload an X-ray image..."}
                                className="min-h-[64px] max-h-40 resize-none border-2 border-border/50 focus:border-primary/50 rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all duration-200 focus:shadow-md bg-background/80 backdrop-blur-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                            />
                            {/* Character count indicator */}
                            {message.length > 0 && (
                                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-full">
                                    {message.length}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="default"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                                className="h-16 w-16 rounded-2xl border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Upload X-ray image"
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <Upload className="h-5 w-5" />
                                    <span className="text-xs">Upload</span>
                                </div>
                            </Button>
                            <Button
                                onClick={handleSendMessage}
                                disabled={isLoading || (!message.trim() && !selectedImage)}
                                className="h-16 w-16 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-primary to-primary/90"
                                size="default"
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <Send className="h-5 w-5" />
                                    <span className="text-xs">Send</span>
                                </div>
                            </Button>
                        </div>
                    </div>

                    {/* Quick Suggestions */}
                    {suggestions.length > 0 && !isLoading && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <div className="text-xs text-muted-foreground mb-2 w-full">
                                Quick suggestions:
                            </div>
                            {suggestions.map((suggestion, idx) => (
                                <Button
                                    key={idx}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="h-9 text-xs border border-border/30 hover:border-primary/40 hover:bg-primary/5 rounded-full px-4 py-2 transition-all duration-200"
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Agent Control Panel */}
            {showAgentPanel && (
                <>
                    {/* Mobile Backdrop */}
                    {isMobile && (
                        <div 
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setShowAgentPanel(false)}
                        />
                    )}
                    
                    <div className="flex-[1] max-w-md min-w-[350px] bg-gradient-to-b from-card/98 to-card/95 backdrop-blur-md border-l border-border/30 shadow-2xl agent-panel z-50">
                        <ScrollArea className="h-full chat-scrollbar">
                            <div className="p-6 space-y-6">
                                {/* Panel Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-border/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                                            <Settings className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="font-semibold text-lg">Agent Controls</h2>
                                            <p className="text-xs text-muted-foreground">Voice & Chat Settings</p>
                                        </div>
                                    </div>
                                    {/* Mobile Close Button */}
                                    {isMobile && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowAgentPanel(false)}
                                            className="h-8 w-8 p-0 md:hidden"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                            {/* Voice Settings */}
                            <Card className="chat-card border-border/30 shadow-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg flex items-center justify-center">
                                            <Mic className="h-4 w-4 text-blue-600" />
                                        </div>
                                        Voice Settings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                        <Label htmlFor="voice-mode" className="text-sm flex items-center gap-3 cursor-pointer">
                                            <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <Mic className="h-3 w-3 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-medium">Voice Input</div>
                                                <div className="text-xs text-muted-foreground">Enable voice commands</div>
                                            </div>
                                        </Label>
                                        <Switch
                                            id="voice-mode"
                                            checked={voiceEnabled}
                                            onCheckedChange={setVoiceEnabled}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                        <Label htmlFor="auto-play" className="text-sm flex items-center gap-3 cursor-pointer">
                                            <div className="w-6 h-6 bg-green-500/10 rounded-lg flex items-center justify-center">
                                                <Volume2 className="h-3 w-3 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium">Auto-play</div>
                                                <div className="text-xs text-muted-foreground">Play responses automatically</div>
                                            </div>
                                        </Label>
                                        <Switch
                                            id="auto-play"
                                            checked={autoPlay}
                                            onCheckedChange={setAutoPlay}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Audio Controls */}
                            <Card className="chat-card border-border/30 shadow-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-lg flex items-center justify-center">
                                            <Bot className="h-4 w-4 text-purple-600" />
                                        </div>
                                        Voice Assistant
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <AudioChat
                                        onTextMessage={async (text: string) => {
                                            setMessage(prev => prev + (prev ? ' ' : '') + text);
                                            if (text.trim()) {
                                                await handleSendMessage();
                                            }
                                        }}
                                        isLoading={isLoading}
                                        lastBotMessage={messages.length > 0 && messages[messages.length - 1].type === 'bot' 
                                            ? messages[messages.length - 1].content 
                                            : undefined}
                                    />
                                </CardContent>
                            </Card>

                            {/* Current Analysis */}
                            {currentAnalysis && (
                                <Card className="chat-card border-border/30 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-lg flex items-center justify-center">
                                                <Activity className="h-4 w-4 text-amber-600" />
                                            </div>
                                            Analysis Results
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {currentAnalysis.diagnosis && (
                                            <div className="p-4 bg-muted/20 rounded-xl">
                                                <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    </div>
                                                    Diagnosis
                                                </h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {currentAnalysis.diagnosis.primary_finding || 'No specific findings'}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {currentAnalysis.triage && (
                                            <div className="p-4 bg-muted/20 rounded-xl">
                                                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-red-500/20 rounded-full flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                    </div>
                                                    Triage Assessment
                                                </h4>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Badge 
                                                        variant={
                                                            currentAnalysis.triage.level === 'RED' ? 'destructive' :
                                                            currentAnalysis.triage.level === 'AMBER' ? 'default' : 'secondary'
                                                        }
                                                        className="text-xs px-3 py-1"
                                                    >
                                                        {currentAnalysis.triage.level}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {(currentAnalysis.triage.confidence * 100).toFixed(0)}% confidence
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {currentAnalysis.triage.recommendation}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {currentAnalysis.body_part && (
                                            <div className="p-4 bg-muted/20 rounded-xl">
                                                <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    </div>
                                                    Body Part
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {currentAnalysis.body_part}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Chat Actions */}
                            <Card className="chat-card border-border/30 shadow-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-slate-500/20 to-slate-500/10 rounded-lg flex items-center justify-center">
                                            <MessageSquare className="h-4 w-4 text-slate-600" />
                                        </div>
                                        Chat Actions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={startNewChat}
                                        disabled={isLoading}
                                        className="w-full justify-start h-11 rounded-xl border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                                <MessageSquare className="h-3 w-3 text-blue-600" />
                                            </div>
                                            <span>New Chat</span>
                                        </div>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearChat}
                                        disabled={isLoading}
                                        className="w-full justify-start h-11 rounded-xl border-border/50 hover:bg-red-500/5 hover:border-red-500/30 transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-red-500/10 rounded-lg flex items-center justify-center">
                                                <Trash2 className="h-3 w-3 text-red-600" />
                                            </div>
                                            <span>Clear Messages</span>
                                        </div>
                                    </Button>
                                    {error && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={retryLastMessage}
                                            className="w-full justify-start h-11 rounded-xl border-border/50 hover:bg-amber-500/5 hover:border-amber-500/30 transition-all duration-200"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                                    <RotateCcw className="h-3 w-3 text-amber-600" />
                                                </div>
                                                <span>Retry Last Message</span>
                                            </div>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>
                </div>
                </>
            )}
        </div>
    );
}