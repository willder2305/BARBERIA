import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.db import db_cursor
from app.services.whatsapp import process_due_reminders


def main():
    app = create_app()
    with app.app_context():
        with db_cursor(commit=True) as cursor:
            result = process_due_reminders(cursor)
    print(result)


if __name__ == "__main__":
    main()
