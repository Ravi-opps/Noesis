import psycopg2
from psycopg2.extensions import connection

from .config import DB_CONFIG


def get_connection() -> connection:
    return psycopg2.connect(**DB_CONFIG)
