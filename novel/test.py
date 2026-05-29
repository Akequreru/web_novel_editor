import google.generativeai as genai
import os
from dotenv import load_dotenv

# .envの読み込みチェック
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

print(f"--- Debug Info ---")
print(f"API Key loaded: {'Yes' if api_key else 'No'}")

if not api_key:
    print("Error: API Key is missing. Check your .env file.")
    exit()

try:
    genai.configure(api_key=api_key)
    
    print("Fetching models...")
    models = list(genai.list_models())
    
    if not models:
        print("No models found. Check your API key permissions.")
    else:
        print(f"Found {len(models)} models:")
        for m in models:
            # 全てのモデル名と、それがサポートしている機能を表示
            print(f"- {m.name} (Methods: {m.supported_generation_methods})")
            
except Exception as e:
    print(f"An error occurred: {e}")