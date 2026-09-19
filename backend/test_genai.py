import asyncio
from google import genai
import json
from dotenv import load_dotenv
import os

load_dotenv()
async def main():
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = "Transcript: \"5 packets of milk came in\""
    try:
        response = await client.aio.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                max_output_tokens=512,
                system_instruction="Output a JSON with intent, quantity, product. E.g. {\"intent\": \"STOCK_IN\", \"quantity\": 5, \"product\": \"milk\"}"
            )
        )
        print("RAW:", response.text)
    except Exception as e:
        print("ERR:", e)

asyncio.run(main())
