
FROM python:3.11-slim
 
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
 
COPY engine/ ./engine/
COPY flask_app/ ./flask_app/
 
EXPOSE 5000
CMD ["python", "flask_app/app.py"]