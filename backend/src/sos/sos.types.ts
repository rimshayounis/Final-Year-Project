export interface ChatMessage {
  role: string;
  text: string;
}

export interface ContactResult {
  name:         string;
  relationship: string;
  email:        string;
  emailStatus:  string;
}