#!/bin/bash
# Start script for production deployment
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
