# Usa una imagen base de Python oficial. La versión 3.9 es estable y compatible.
FROM python:3.9

# Establece el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Copia el archivo de requisitos al directorio de trabajo.
COPY requirements.txt .

# Instala las dependencias.
# --no-cache-dir reduce el tamaño de la imagen final.
# --prefer-binary acelera la instalación al preferir paquetes precompilados.
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copia el resto del código de la aplicación (app.py) al directorio de trabajo.
COPY . .

# Expone el puerto en el que se ejecutará la aplicación.
# Debe coincidir con el puerto en el comando CMD.
EXPOSE 8000

# Define el comando para iniciar el servidor FastAPI con Uvicorn.
# --host 0.0.0.0 permite que el servidor sea accesible desde fuera del contenedor.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
