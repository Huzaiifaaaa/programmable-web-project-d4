"""
ProBot API client.

Handles authentication and all HTTP communication with the ProBot REST API.
Automatically refreshes the JWT token when expired.
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

PROBOT_API_URL = os.getenv("PROBOT_API_URL", "http://localhost:5000/api/v1")
PROBOT_EMAIL = os.getenv("PROBOT_EMAIL", "autoservice@probot.fi")
PROBOT_PASSWORD = os.getenv("PROBOT_PASSWORD", "autoservice_password")


class ProbotClient:
    """HTTP client for the ProBot REST API."""

    def __init__(self):
        self.base_url = PROBOT_API_URL
        self.token = None
        self.user = None

    def _headers(self):
        """Return auth headers for authenticated requests."""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}" if self.token else ""
        }

    def authenticate(self):
        """
        Authenticate with ProBot API and store the JWT token.
        Returns True on success, False on failure.
        """
        try:
            response = requests.post(
                f"{self.base_url}/login/",
                json={"email": PROBOT_EMAIL, "password": PROBOT_PASSWORD},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                self.user = data.get("user")
                logger.info("Authenticated as %s", PROBOT_EMAIL)
                return True
            logger.error("Authentication failed: %s", response.text)
            return False
        except requests.RequestException as exc:
            logger.error("Authentication error: %s", exc)
            return False

    def register_service_account(self):
        """
        Register the service account if it does not exist yet.
        Safe to call multiple times — ignores 409 conflict.
        """
        try:
            response = requests.post(
                f"{self.base_url}/signup/",
                json={
                    "name": "AutoService",
                    "email": PROBOT_EMAIL,
                    "password": PROBOT_PASSWORD
                },
                timeout=10
            )
            if response.status_code in (201, 200):
                logger.info("Service account registered.")
            elif response.status_code == 409:
                logger.info("Service account already exists.")
            else:
                logger.warning("Signup response: %s", response.text)
        except requests.RequestException as exc:
            logger.error("Registration error: %s", exc)

    def create_chat(self):
        """Create a new chat session. Returns chat dict or None."""
        try:
            response = requests.post(
                f"{self.base_url}/chats/",
                json={},
                headers=self._headers(),
                timeout=10
            )
            if response.status_code in (200, 201):
                return response.json().get("chat")
            logger.error("Create chat failed: %s", response.text)
            return None
        except requests.RequestException as exc:
            logger.error("Create chat error: %s", exc)
            return None

    def send_message(self, chat_key, message, model_key=None):
        """
        Send a message to a chat and return the conversation dict.

        Args:
            chat_key (str): The chat key to send the message to.
            message (str): The message text.
            model_key (str): Optional Gemini model key.

        Returns:
            dict or None: The conversation object from the API.
        """
        payload = {"message": message}
        if model_key:
            payload["model_key"] = model_key
        try:
            response = requests.post(
                f"{self.base_url}/chats/{chat_key}/messages/",
                json=payload,
                headers=self._headers(),
                timeout=30
            )
            if response.status_code in (200, 201):
                return response.json().get("conversation")
            logger.error("Send message failed: %s", response.text)
            return None
        except requests.RequestException as exc:
            logger.error("Send message error: %s", exc)
            return None

    def get_messages(self, chat_key):
        """
        Retrieve all messages in a chat.

        Args:
            chat_key (str): The chat key.

        Returns:
            list: List of conversation dicts.
        """
        try:
            response = requests.get(
                f"{self.base_url}/chats/{chat_key}/messages/",
                headers=self._headers(),
                timeout=10
            )
            if response.status_code == 200:
                return response.json().get("messages", [])
            logger.error("Get messages failed: %s", response.text)
            return []
        except requests.RequestException as exc:
            logger.error("Get messages error: %s", exc)
            return []

    def delete_chat(self, chat_key):
        """Delete a chat session by key."""
        try:
            response = requests.delete(
                f"{self.base_url}/chats/{chat_key}/",
                headers=self._headers(),
                timeout=10
            )
            return response.status_code in (200, 204)
        except requests.RequestException as exc:
            logger.error("Delete chat error: %s", exc)
            return False