# # backend/deploy/Dockerfile
# FROM python:3.12-slim
# WORKDIR /app

# # copy only your reqs
# COPY requirements.txt .

# # install pip, itsdangerous and all your requirements into /install
# RUN pip install --no-cache-dir -r requirements.txt

# FROM python:3.12-slim  
# ENV PYTHONUNBUFFERED=1
# WORKDIR /app

# # bring in the built packages
# COPY --from=build /install /usr/local

# # copy your app code
# COPY app ./app

# # expose Uvicorn port
# EXPOSE 8000

# # <--- no extra quote at the end here
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]