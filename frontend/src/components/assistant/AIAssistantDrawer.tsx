import React, { useState } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Database,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';
import { api } from '../../api/client';
import type { AssistantQueryResponse } from '../../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: AssistantQueryResponse['citations'];
  sourceModule?: string;
  suggestedFollowups?: string[];
  timestamp: Date;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultSuggestions = [
  'What was the total energy consumption in the selected period?',
  'What consumption is forecast for the next seven days?',
  'Which unusual readings or anomalies require investigation?',
  'What is our estimated carbon impact and footprint?',
  'Which energy recommendations have the highest potential savings?',
];

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { selectedDataset } = useDataset();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **EcoMind AI Sustainability Intelligence Assistant**.\n\nI can analyze your energy consumption, forecast future loads, explain detected anomalies, quantify your carbon footprint, and summarize actionable efficiency recommendations based on your active dataset.`,
      timestamp: new Date(),
      suggestedFollowups: defaultSuggestions.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.queryAssistant(textToSend, selectedDataset?.id);
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.answer,
        citations: res.citations,
        sourceModule: res.source_module,
        suggestedFollowups: res.suggested_followups,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `Sorry, an error occurred while processing your query: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedText = (raw: string) => {
    // Basic Markdown parser for headings, lists, bolding
    const lines = raw.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 text-sm mt-2 mb-1">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('- ')) {
            const content = line.replace('- ', '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-brand-600 font-bold">•</span>
                <span>{renderInlineBold(content)}</span>
              </div>
            );
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx}>{renderInlineBold(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-96 flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 bg-slate-900 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">EcoMind AI Assistant</h3>
            <p className="text-[10px] text-slate-400">
              {selectedDataset ? selectedDataset.name : 'No active dataset'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-medium text-slate-400">
              {msg.sender === 'user' ? (
                <>
                  <span>You</span>
                  <User className="h-3 w-3" />
                </>
              ) : (
                <>
                  <Bot className="h-3 w-3 text-brand-600" />
                  <span>EcoMind Intelligence</span>
                  {msg.sourceModule && (
                    <span className="rounded bg-brand-50 px-1 py-0.2 text-brand-700 font-semibold border border-brand-200">
                      {msg.sourceModule}
                    </span>
                  )}
                </>
              )}
            </div>

            <div
              className={`rounded-2xl px-4 py-3 max-w-[92%] shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-slate-900 text-white rounded-br-none text-xs leading-relaxed'
                  : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none'
              }`}
            >
              {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}

              {/* Citations Box */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <Database className="h-3 w-3 text-brand-600" />
                    Verified Data Citations
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {msg.citations.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-[11px] border border-slate-200/60"
                      >
                        <span className="text-slate-500">{c.metric}</span>
                        <span className="font-semibold text-brand-700">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up suggestions */}
            {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 max-w-[92%]">
                {msg.suggestedFollowups.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(f)}
                    className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 hover:border-brand-500 hover:text-brand-700 hover:bg-brand-50/50 transition-colors shadow-2xs"
                  >
                    <span>{f}</span>
                    <ArrowRight className="h-2.5 w-2.5 text-brand-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 max-w-[80%] shadow-sm">
            <Sparkles className="h-4 w-4 animate-spin text-brand-600" />
            <span className="text-xs text-slate-600 font-medium animate-pulse">
              Querying analytics & ML models...
            </span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="border-t border-slate-200 p-3 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about consumption, forecasts, anomalies..."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-40 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
