from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.table import Table

def print_banner():
    console = Console()
    
    # Header Text
    header = Text("ERP G7 - SMARTFLOW SYSTEM", style="bold white on blue", justify="center")
    
    # Main Panel
    panel_content = Text()
    panel_content.append("\n INITIALIZING BACKEND API SERVER...\n", style="bold green")
    panel_content.append(" [*] Framework: ", style="cyan")
    panel_content.append("FastAPI\n", style="bold white")
    panel_content.append(" [*] Database: ", style="cyan")
    panel_content.append("SQL Server (MSSQL)\n", style="bold white")
    panel_content.append(" [*] System: ", style="cyan")
    panel_content.append("SmartFlow Claim_v2 Engine\n", style="bold white")
    
    console.print(Panel(panel_content, title="[bold magenta]Claim_v2 Core[/bold magenta]", subtitle="[bold yellow]Ready to Serve[/bold yellow]", expand=False))

    # Features Table
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Module", style="dim", width=25)
    table.add_column("Endpoint Prefix", width=35)
    table.add_column("Status", justify="right")
    
    table.add_row("Customer Claims", "/api/v1/claims/claims", "[green]Online[/green]")
    table.add_row("Cabinet Price Master", "/api/v1/claims/cabinet-prices", "[green]Online[/green]")
    table.add_row("Defect Catalog (Atlas/G7)", "/api/v1/inspections/defect-types", "[green]Online[/green]")
    table.add_row("Defect Glossary", "/api/v1/inspections/defect-glossary", "[green]Online[/green]")
    
    console.print(table)
    console.print("\n[bold yellow]>[/bold yellow] [bold white]Docs:[/bold white] http://localhost:8000/docs")
    console.print("[bold yellow]>[/bold yellow] [bold white]Logs:[/bold white] [dim]Streaming incoming requests...[/dim]\n")

if __name__ == "__main__":
    print_banner()
