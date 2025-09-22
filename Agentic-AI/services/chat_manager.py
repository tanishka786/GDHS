"""Chat session management for OrthoAssist."""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from loguru import logger

from schemas.chat import ChatSession, ChatMessage, ChatResponse
from schemas.base import PatientInfo


class ChatSessionManager:
    """Manages chat sessions and conversation history."""
    
    def __init__(self):
        """Initialize the session manager."""
        # In production, this should use Redis or a proper database
        self._sessions: Dict[str, ChatSession] = {}
        self._max_sessions = 1000  # Prevent memory overflow
        
    def create_session(self, initial_context: Optional[Dict[str, Any]] = None) -> str:
        """Create a new chat session."""
        chat_id = str(uuid.uuid4())
        
        # Clean up old sessions if we're at the limit
        if len(self._sessions) >= self._max_sessions:
            self._cleanup_old_sessions()
        
        session = ChatSession(
            chat_id=chat_id,
            messages=[],
            context=initial_context or {},
            current_analysis=None
        )
        
        self._sessions[chat_id] = session
        logger.info(f"Created new chat session: {chat_id}")
        
        return chat_id
    
    def get_session(self, chat_id: str) -> Optional[ChatSession]:
        """Get a chat session by ID."""
        session = self._sessions.get(chat_id)
        if session:
            # Update access time
            session.updated_at = datetime.now().isoformat()
        return session
    
    def update_session_context(self, chat_id: str, context_update: Dict[str, Any]) -> bool:
        """Update session context."""
        session = self.get_session(chat_id)
        if not session:
            return False
        
        session.context.update(context_update)
        session.updated_at = datetime.now().isoformat()
        return True
    
    def save_message(self, chat_id: str, user_message: str, bot_response: str, 
                    intent: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Save a message exchange to the session."""
        session = self.get_session(chat_id)
        if not session:
            return False
        
        message_data = {
            "user_message": user_message,
            "bot_response": bot_response,
            "timestamp": datetime.now().isoformat(),
            "intent": intent,
            "metadata": metadata or {}
        }
        
        session.messages.append(message_data)
        session.updated_at = datetime.now().isoformat()
        
        # Limit message history to prevent memory issues
        if len(session.messages) > 100:
            session.messages = session.messages[-50:]  # Keep last 50 messages
        
        return True
    
    def set_current_analysis(self, chat_id: str, analysis_data: Dict[str, Any]) -> bool:
        """Set the current analysis data for a session."""
        session = self.get_session(chat_id)
        if not session:
            return False
        
        session.current_analysis = analysis_data
        session.updated_at = datetime.now().isoformat()
        return True
    
    def get_current_analysis(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """Get the current analysis data for a session."""
        session = self.get_session(chat_id)
        return session.current_analysis if session else None
    
    def set_patient_info(self, chat_id: str, patient_info: PatientInfo) -> bool:
        """Set patient information for a session."""
        session = self.get_session(chat_id)
        if not session:
            return False
        
        session.patient_info = patient_info
        session.updated_at = datetime.now().isoformat()
        return True
    
    def get_patient_info(self, chat_id: str) -> Optional[PatientInfo]:
        """Get patient information for a session."""
        session = self.get_session(chat_id)
        return session.patient_info if session else None
    
    def get_chat_history(self, chat_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get chat history for a session."""
        session = self.get_session(chat_id)
        if not session:
            return []
        
        messages = session.messages
        if limit:
            messages = messages[-limit:]
        
        return messages
    
    def delete_session(self, chat_id: str) -> bool:
        """Delete a chat session."""
        if chat_id in self._sessions:
            del self._sessions[chat_id]
            logger.info(f"Deleted chat session: {chat_id}")
            return True
        return False
    
    def _cleanup_old_sessions(self):
        """Clean up old sessions to free memory."""
        # Remove sessions older than 24 hours
        cutoff_time = datetime.now().timestamp() - (24 * 60 * 60)
        
        sessions_to_remove = []
        for chat_id, session in self._sessions.items():
            session_time = datetime.fromisoformat(session.updated_at).timestamp()
            if session_time < cutoff_time:
                sessions_to_remove.append(chat_id)
        
        for chat_id in sessions_to_remove:
            del self._sessions[chat_id]
        
        logger.info(f"Cleaned up {len(sessions_to_remove)} old chat sessions")
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get statistics about current sessions."""
        return {
            "total_sessions": len(self._sessions),
            "max_sessions": self._max_sessions,
            "sessions_with_analysis": sum(1 for s in self._sessions.values() if s.current_analysis),
            "sessions_with_patient_info": sum(1 for s in self._sessions.values() if s.patient_info)
        }


# Global session manager instance
chat_session_manager = ChatSessionManager()