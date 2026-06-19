from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore" # Ignore extra env file variables not defined here
    )

    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"
    
    # Meta WhatsApp credentials
    WHATSAPP_API_TOKEN: str | None = None
    WHATSAPP_PHONE_ID: str | None = None
    WHATSAPP_FEE_TEMPLATE: str = "jaspers_market_order_confirmation_v1"
    WHATSAPP_ATTENDANCE_TEMPLATE: str = "jaspers_market_order_confirmation_v1"
    WHATSAPP_PAYMENT_SUCCESS_TEMPLATE: str = "jaspers_market_order_confirmation_v1"
    
    # Razorpay credentials
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None

settings = Settings()
