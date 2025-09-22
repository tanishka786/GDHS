import asyncio
import sys
from loguru import logger

from app.config import config
from app.mcp.server import mcp_server



async def run_mcp_server():
    """Run the MCP server via stdio."""
    logger.info("Starting MCP server in stdio mode...")
    
    # Initialize the server
    await mcp_server.initialize()
    
    # Simple MCP protocol handler (placeholder)
    logger.info("MCP server ready for connections")
    logger.info("Use 'uvicorn api.main:app --host 0.0.0.0 --port 8000' for HTTP API")
    
    # Keep server running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("MCP server shutting down...")


def main():
    """Main entry point."""
    logger.info("Orthopedic Assistant MCP Server v0.1.0")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--http":
        print("Use: uvicorn api.main:app --host 0.0.0.0 --port 8000")
        print("Or: uvicorn api.main:app --reload (for development)")
    else:
        # Run MCP server
        asyncio.run(run_mcp_server())


if __name__ == "__main__":
    main()
