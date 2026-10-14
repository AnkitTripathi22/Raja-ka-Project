 # 1. Base Image: Lightweight Python 3.11 Linux OS
 FROM python:3.11-slim
 
 # 2. Container ke andar working directory set karna
 WORKDIR /app
 
 # 3. Layer Caching: Pehle requirements copy karo
 COPY requirements.txt .
 
 # 4. Dependencies install karo (pip cache store na kare taaki size chota rahe)
 RUN pip install --no-cache-dir -r requirements.txt
 
 # 5. Baaki saara backend code copy karo
 COPY . .
 
 # 6. Port 8000 expose karo
 EXPOSE 8000
 
 # 7. Production Uvicorn start command ($PORT support ke sath for Render/Local)
 CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]