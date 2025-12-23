
import sqlite3
import string
import random

DATABASE_NAME = "database.db"

def get_db_connection():
    """Creates a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_database():
    """Initializes the database and creates tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS priority_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            uses_remaining INTEGER NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS processing_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL,
            queue_position INTEGER NOT NULL,
            is_priority BOOLEAN DEFAULT FALSE,
            image_data BLOB NOT NULL,
            result_data BLOB
        )
    ''')

    conn.commit()
    conn.close()

def generate_code(length=8):
    """Generates a unique random code of a given length."""
    characters = string.ascii_letters + string.digits
    while True:
        code = ''.join(random.choice(characters) for i in range(length))
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM priority_codes WHERE code = ?", (code,))
        if cursor.fetchone() is None:
            conn.close()
            return code
        conn.close()

def add_code(code, uses):
    """Adds a new priority code to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO priority_codes (code, uses_remaining) VALUES (?, ?)", (code, uses))
    conn.commit()
    conn.close()

def validate_code(code):
    """Checks if a code exists and has uses remaining."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT uses_remaining FROM priority_codes WHERE code = ?", (code,))
    result = cursor.fetchone()
    conn.close()
    if result and result['uses_remaining'] > 0:
        return True
    return False

def use_code(code):
    """Decrements the use count of a code and deletes it if uses reach zero."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT uses_remaining FROM priority_codes WHERE code = ?", (code,))
    result = cursor.fetchone()
    if result:
        new_uses = result['uses_remaining'] - 1
        if new_uses > 0:
            cursor.execute("UPDATE priority_codes SET uses_remaining = ? WHERE code = ?", (new_uses, code))
        else:
            cursor.execute("DELETE FROM priority_codes WHERE code = ?", (code,))
        conn.commit()
    conn.close()

def add_job(job_id, image_data):
    """Adds a new job to the processing queue."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM processing_jobs WHERE status = 'queued'")
    queue_position = cursor.fetchone()['count'] + 1
    cursor.execute(
        "INSERT INTO processing_jobs (job_id, status, queue_position, image_data) VALUES (?, ?, ?, ?)",
        (job_id, "queued", queue_position, image_data)
    )
    conn.commit()
    conn.close()
    return queue_position

def get_job_by_id(job_id):
    """Retrieves a job from the database by its job_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM processing_jobs WHERE job_id = ?", (job_id,))
    job = cursor.fetchone()
    conn.close()
    return job

def apply_priority_code_and_reorder(job_id):
    """
    Applies priority to a job and reorders the queue based on the 1P-2NP rule.
    Finds the last priority job and inserts the new one two normal-jobs-positions after.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get all queued jobs, ordered by position
    cursor.execute("SELECT job_id, queue_position, is_priority FROM processing_jobs WHERE status = 'queued' ORDER BY queue_position ASC")
    all_jobs = cursor.fetchall()

    # Find the position of the last priority job
    last_priority_pos = 0
    for job in all_jobs:
        if job['is_priority']:
            last_priority_pos = job['queue_position']

    # The target position is 3 places after the last priority job (1P, 2NP)
    # The minimum position is 1
    target_pos = max(1, last_priority_pos + 3)

    # To avoid collisions and ensure fairness, we cap the target position
    if target_pos > len(all_jobs):
        target_pos = len(all_jobs)

    # Make space for the priority job by shifting other jobs down
    cursor.execute(
        "UPDATE processing_jobs SET queue_position = queue_position + 1 WHERE status = 'queued' AND queue_position >= ?",
        (target_pos,)
    )

    # Move the prioritized job into its new slot
    cursor.execute(
        "UPDATE processing_jobs SET is_priority = TRUE, queue_position = ? WHERE job_id = ?",
        (target_pos, job_id)
    )

    # Re-normalize the queue positions to be contiguous (1, 2, 3, ...)
    cursor.execute("SELECT job_id FROM processing_jobs WHERE status = 'queued' ORDER BY queue_position ASC")
    sorted_jobs = cursor.fetchall()
    for i, job in enumerate(sorted_jobs):
        cursor.execute("UPDATE processing_jobs SET queue_position = ? WHERE job_id = ?", (i + 1, job['job_id']))

    # After re-normalization, get the final, accurate position of the job
    cursor.execute("SELECT queue_position FROM processing_jobs WHERE job_id = ?", (job_id,))
    final_position = cursor.fetchone()['queue_position']

    conn.commit()
    conn.close()
    return final_position


def get_next_job_in_queue():
    """Gets the job with the lowest queue_position that is 'queued'."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM processing_jobs WHERE status = 'queued' ORDER BY queue_position ASC LIMIT 1")
    job = cursor.fetchone()
    conn.close()
    return job

def update_job_status_and_result(job_id, status, result_data=None):
    """Updates the status and optionally the result of a job."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if result_data:
        cursor.execute("UPDATE processing_jobs SET status = ?, result_data = ?, queue_position = 0 WHERE job_id = ?", (status, result_data, job_id))
    else:
        cursor.execute("UPDATE processing_jobs SET status = ? WHERE job_id = ?", (status, job_id))
    conn.commit()
    conn.close()

def reorder_queue_after_completion():
    """Reorders the queue by decrementing the position of all queued jobs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE processing_jobs SET queue_position = queue_position - 1 WHERE status = 'queued'")
    conn.commit()
    conn.close()

# Initialize the database when this module is imported
initialize_database()
