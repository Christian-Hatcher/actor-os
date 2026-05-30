-- Add LLM settings column to profiles
-- Stores user's chosen AI provider and API key
-- Structure: { "provider": "openai"|"anthropic"|"gemini", "api_key": "sk-...", "model": "gpt-4o-mini" }
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS llm_settings jsonb DEFAULT NULL;
