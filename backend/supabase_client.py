import os
from supabase import create_client, Client
from typing import Optional
from dotenv import load_dotenv
from utils.logger import logger

# Load environment variables (search upwards for root .env.supabase)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.supabase'))
load_dotenv('.env.supabase') # Fallback to local if present

class SupabaseClient:
    _instance: Optional[Client] = None
    _service_instance: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_ANON_KEY")

            if not supabase_url or not supabase_key:
                raise ValueError("Supabase URL and API key must be set in environment variables")

            cls._instance = create_client(supabase_url, supabase_key)

        return cls._instance

    @classmethod
    def get_service_client(cls) -> Client:
        """Client with service_role key to bypass RLS (use sparingly)"""
        if cls._service_instance is None:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

            if not supabase_url or not supabase_key:
                # Fallback to anon key if service role is not available, but warn
                logger.warning("SUPABASE_SERVICE_KEY not found, using ANON_KEY")
                return cls.get_client()

            cls._service_instance = create_client(supabase_url, supabase_key)

        return cls._service_instance

# Global supabase client instance
supabase = SupabaseClient.get_client()
supabase_service = SupabaseClient.get_service_client()
