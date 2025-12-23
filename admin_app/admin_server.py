
import os
import webbrowser
from flask import Flask, render_template, request, jsonify

# This creates the Flask web server
app = Flask(__name__)

@app.route("/")
def index():
    """Serves the main admin panel page."""
    return render_template("index.html")

if __name__ == "__main__":
    # We expect index.html to be in the templates folder and admin.js/styles.css in static
    print("Starting the local admin server...")
    print("Go to http://1227.0.0.1:8002 in your web browser.")

    # Open the web browser automatically
    webbrowser.open("http://127.0.0.1:8002")

    # Run the server
    app.run(port=8002, debug=False)
