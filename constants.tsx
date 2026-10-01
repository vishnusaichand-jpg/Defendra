
import React from 'react';
import { 
  Send, 
  User, 
  Bot, 
  Shield, 
  Lock, 
  LogOut, 
  Volume2, 
  Image as ImageIcon, 
  Film, 
  Search, 
  Map, 
  Zap 
} from 'lucide-react';

export const SYSTEM_INSTRUCTION = `
You are a protective and intelligent AI security assistant named "Defendra".

CORE MISSION:
- Provide clear, calm, and professional guidance on cybersecurity and digital safety.
- Build user confidence through accurate and supportive information.

COMMUNICATION GUIDELINES:
- Be concise but human. Avoid overly robotic jargon unless specifically requested.
- Use a reassuring and professional tone. Never use alarmist or fear-based language.
- Always provide a clear "Next Step" or practical advice.
- If unsure, state: "I need to verify this further to ensure your safety. Here is my current assessment..."

RESPONSE FORMATTING:
- Use bullet points for lists.
- Keep paragraphs short (2-3 sentences).
- End every response with a confidence score on a new line.
- Format: "Confidence Score: 0.xx"

PLAN-SPECIFIC DEPTH:
[USER_PLAN: FREE] -> Direct, 2-4 line summaries.
[USER_PLAN: BASIC] -> 5-8 lines with one clear example.
[USER_PLAN: PRO] -> Comprehensive analysis with best practices and preventive measures.
`;

export const PLANS = [
  {
    id: 'FREE',
    name: 'Standard Access',
    price: '$0',
    features: ['3 Secure Queries / Session', 'Basic Safety Guidance', 'Community Resources']
  },
  {
    id: 'BASIC',
    name: 'Agent Tier',
    price: '$9',
    features: ['Unlimited Secure Queries', 'Identity Protection Tips', 'Scam Verification Buffer']
  },
  {
    id: 'PRO',
    name: 'Enterprise Tier',
    price: '$19',
    features: ['Advanced Threat Analysis', 'Priority Neural Processing', 'Deep Vault Access', 'Weekly Security Audits']
  }
];

export const Icons = {
  Send: () => <Send className="w-5 h-5" />,
  User: () => <User className="w-5 h-5" />,
  Bot: () => <Bot className="w-5 h-5" />,
  Shield: () => <Shield className="w-5 h-5" />,
  Lock: () => <Lock className="w-5 h-5" />,
  LogOut: () => <LogOut className="w-5 h-5" />,
  Speaker: () => <Volume2 className="w-5 h-5" />,
  Image: () => <ImageIcon className="w-5 h-5" />,
  Movie: () => <Film className="w-5 h-5" />,
  Search: () => <Search className="w-5 h-5" />,
  Map: () => <Map className="w-5 h-5" />,
  Zap: () => <Zap className="w-5 h-5" />
};
