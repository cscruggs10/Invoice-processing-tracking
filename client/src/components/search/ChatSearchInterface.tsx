import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Sparkles, 
  History, 
  Lightbulb, 
  Search,
  Bot,
  User,
  Clock,
  ArrowUp
} from "lucide-react";

interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'vendor' | 'amount' | 'date';
  category: string;
  confidence: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  query?: string;
  results?: any;
  loading?: boolean;
}

interface ChatSearchInterfaceProps {
  onSearch: (query: string) => Promise<any>;
  suggestions: SearchSuggestion[];
  onSuggestionSelect: (suggestion: string) => void;
  isLoading?: boolean;
}

export function ChatSearchInterface({ 
  onSearch, 
  suggestions, 
  onSuggestionSelect, 
  isLoading = false 
}: ChatSearchInterfaceProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your invoice search assistant. You can ask me things like:\n\n• \"Show me all parts invoices over $500\"\n• \"Find ABC Corporation invoices from last month\"\n• \"What's the total for all invoices this year?\"\n• \"Show pending invoices with missing GL codes\"\n\nWhat would you like to search for?",
      timestamp: new Date()
    }
  ]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (query.length > 0) {
      const filtered = suggestions.filter(s => 
        s.text.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [query, suggestions]);

  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: finalQuery,
      timestamp: new Date(),
      query: finalQuery
    };

    // Add loading assistant message
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: "",
      timestamp: new Date(),
      loading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setQuery("");
    setShowSuggestions(false);

    try {
      const results = await onSearch(finalQuery);
      
      // Replace loading message with actual response
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: results.conversationalResponse || `I found ${results.total} invoices matching your search.`,
              results: results,
              loading: false
            }
          : msg
      ));
    } catch (error) {
      // Replace loading message with error
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: "I'm sorry, I encountered an error while searching. Please try again.",
              loading: false
            }
          : msg
      ));
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    onSuggestionSelect(suggestion.text);
    // Auto-search when suggestion is selected
    setTimeout(() => handleSearch(suggestion.text), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const quickSuggestions = [
    "Show all parts invoices over $500", 
    "Find labor invoices from last month",
    "What's the total for all invoices this year?",
    "Show filed invoices from ABC Corporation"
  ];

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-900 rounded-lg border modern-card">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Invoice Search</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ask me anything about your filed invoices</p>
          </div>
          <div className="ml-auto">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
              <Sparkles className="h-3 w-3 mr-1" />
              Smart Search
            </Badge>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
            }`}>
              {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            
            <div className={`flex-1 max-w-[80%] ${message.type === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
              }`}>
                {message.loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="text-sm">Searching...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                )}
              </div>
              
              {/* Show results summary for assistant messages with results */}
              {message.type === 'assistant' && message.results && !message.loading && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{message.results.total}</div>
                      <div className="text-xs text-gray-600">Invoices</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        ${message.results.summary?.totalAmount?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-gray-600">Total Value</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-600">
                        ${message.results.summary?.averageAmount?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-gray-600">Average</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-orange-600">
                        {message.results.summary?.topVendors?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Vendors</div>
                    </div>
                  </div>
                  
                  {message.results.summary?.topVendors?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {message.results.summary.topVendors.slice(0, 3).map((vendor: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {vendor.name}: ${vendor.total.toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions (when no messages or input is empty) */}
      {messages.length === 1 && !query && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Try these examples:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs hover-lift"
                onClick={() => handleSuggestionClick({ text: suggestion, type: 'query', category: 'Quick', confidence: 1 })}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 relative">
        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="text-sm">{suggestion.text}</span>
                <Badge variant="outline" className="text-xs">{suggestion.category}</Badge>
              </button>
            ))}
          </div>
        )}
        
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your invoices... (e.g., 'Show me all parts invoices over $500')"
              className="pr-10"
              disabled={isLoading}
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <Button 
            onClick={() => handleSearch()}
            disabled={!query.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Press Enter to search</span>
          <div className="flex items-center gap-4">
            <span>Powered by AI</span>
            <Badge variant="outline" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Smart Search
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}