import os
import json
import sqlite3
import datetime
import io
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server
import matplotlib.pyplot as plt

# Database Initialization and Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), "persona_carbo.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessment_history (
            id TEXT PRIMARY KEY,
            timestamp TEXT,
            name TEXT,
            age INTEGER,
            country TEXT,
            city TEXT,
            total_carbon INTEGER,
            score INTEGER,
            rating TEXT,
            user_data TEXT,
            result_data TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_assessment(assessment_id, name, age, country, city, total_carbon, score, rating, user_data, result_data):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO assessment_history 
        (id, timestamp, name, age, country, city, total_carbon, score, rating, user_data, result_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        assessment_id,
        timestamp,
        name,
        age,
        country,
        city,
        total_carbon,
        score,
        rating,
        json.dumps(user_data),
        json.dumps(result_data)
    ))
    conn.commit()
    conn.close()

def get_history():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, timestamp, name, age, country, city, total_carbon, score, rating FROM assessment_history ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for row in rows:
        history.append({
            "id": row[0],
            "timestamp": row[1],
            "name": row[2],
            "age": row[3],
            "country": row[4],
            "city": row[5],
            "totalCarbonFootprint": row[6],
            "sustainabilityScore": row[7],
            "rating": row[8]
        })
    return history

def get_report_by_id(report_id):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT user_data, result_data, timestamp FROM assessment_history WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    return {
        "user_data": json.loads(row[0]),
        "result_data": json.loads(row[1]),
        "timestamp": row[2]
    }

# Carbon Emission Calculator
def calculate_personal_carbon(data: dict) -> dict:
    # 1. Transportation
    vehicle_type = data.get("vehicleType", "None")
    km_per_week = float(data.get("kmTravelledPerWeek", 0.0) or 0.0)
    flights_per_year = float(data.get("flightsPerYear", 0.0) or 0.0)
    public_transport = data.get("publicTransportUsage", "Never")
    
    # Vehicle factors in kg CO2 per km
    vehicle_factors = {
        "None": 0.0,
        "Bicycle": 0.0,
        "Motorcycle": 0.08,
        "Petrol Car": 0.18,
        "Diesel Car": 0.17,
        "CNG Car": 0.12,
        "Electric Car": 0.05
    }
    vehicle_emissions = km_per_week * 52 * vehicle_factors.get(vehicle_type, 0.0)
    
    public_transport_emissions = {
        "Never": 0.0,
        "Rarely": 50.0,
        "Sometimes": 150.0,
        "Frequently": 400.0,
        "Daily": 800.0
    }.get(public_transport, 0.0)
    
    flight_emissions = flights_per_year * 500.0
    transportation_total = vehicle_emissions + public_transport_emissions + flight_emissions

    # 2. Electricity
    monthly_kwh = data.get("monthlyElectricityKwh")
    monthly_bill = data.get("monthlyElectricityBill")
    
    if monthly_kwh is not None and monthly_kwh != "":
        kwh_per_month = float(monthly_kwh)
    elif monthly_bill is not None and monthly_bill != "":
        kwh_per_month = float(monthly_bill) / 8.0
    else:
        kwh_per_month = 200.0
        
    annual_kwh = kwh_per_month * 12
    grid_factor = 0.85
    solar_panels = data.get("solarPanels", "No")
    solar_reduction = 0.6 if solar_panels == "Yes" else 1.0
    electricity_emissions = annual_kwh * grid_factor * solar_reduction
    
    led_bulbs = data.get("ledBulbs", "No")
    if led_bulbs == "Yes":
        electricity_emissions *= 0.9

    # 3. Food
    diet_type = data.get("dietType", "Vegetarian")
    meat_meals_per_week = float(data.get("meatMealsPerWeek", 0.0) or 0.0)
    milk_consumption = data.get("milkConsumption", "Medium")
    food_waste = data.get("foodWaste", "Medium")
    
    diet_emissions = {
        "Vegan": 600.0,
        "Vegetarian": 1000.0,
        "Eggetarian": 1200.0,
        "Non Vegetarian": 1800.0 + (meat_meals_per_week * 50.0)
    }.get(diet_type, 1000.0)
    
    milk_emissions = {
        "Low": 50.0,
        "Medium": 150.0,
        "High": 300.0
    }.get(milk_consumption, 150.0)
    
    waste_emissions = {
        "Low": 20.0,
        "Medium": 70.0,
        "High": 150.0
    }.get(food_waste, 70.0)
    
    food_total = diet_emissions + milk_emissions + waste_emissions

    # 4. Water
    daily_water_usage = float(data.get("dailyWaterUsage", 150.0) or 150.0)
    shower_duration = data.get("showerDuration", "Medium")
    washing_machine_usage = float(data.get("washingMachineUsagePerWeek", 3.0) or 3.0)
    
    water_emissions = daily_water_usage * 365 * 0.0003
    shower_emissions = {
        "Short": 50.0,
        "Medium": 150.0,
        "Long": 300.0
    }.get(shower_duration, 150.0)
    washing_emissions = washing_machine_usage * 52 * 0.5
    water_total = water_emissions + shower_emissions + washing_emissions

    # 5. Waste
    plastic_waste = data.get("plasticWaste", "Medium")
    recycling = data.get("recycling", "Sometimes")
    composting = data.get("composting", "No")
    
    base_waste_emissions = {
        "Low": 50.0,
        "Medium": 120.0,
        "High": 240.0
    }.get(plastic_waste, 120.0)
    
    recycle_reduction = {
        "Always": 0.5,
        "Sometimes": 0.8,
        "Never": 1.0
    }.get(recycling, 0.8)
    
    composting_reduction = 30.0 if composting == "Yes" else 0.0
    waste_total = (base_waste_emissions * recycle_reduction) - composting_reduction
    waste_total = max(10.0, waste_total)

    # 6. Shopping
    clothes_per_month = float(data.get("clothesPurchasedPerMonth", 2.0) or 2.0)
    online_orders_per_month = float(data.get("onlineOrdersPerMonth", 4.0) or 4.0)
    electronics_per_year = float(data.get("electronicsPurchasedPerYear", 1.0) or 1.0)
    
    clothes_emissions = clothes_per_month * 12 * 15.0
    delivery_emissions = online_orders_per_month * 12 * 3.0
    electronics_emissions = electronics_per_year * 80.0
    shopping_total = clothes_emissions + delivery_emissions + electronics_emissions

    # Totals
    total_carbon_footprint = round(transportation_total + electricity_emissions + food_total + water_total + waste_total + shopping_total)
    sustainability_score = max(10, min(100, round(100 - (total_carbon_footprint / 150.0))))

    if sustainability_score >= 90:
        rating = "Excellent"
    elif sustainability_score >= 75:
        rating = "Good"
    elif sustainability_score >= 60:
        rating = "Average"
    elif sustainability_score >= 40:
        rating = "Needs Improvement"
    else:
        rating = "Critical"

    breakdown = {
        "transportation": round(transportation_total),
        "electricity": round(electricity_emissions),
        "food": round(food_total),
        "water": round(water_total),
        "waste": round(waste_total),
        "shopping": round(shopping_total)
    }

    recommendations = []
    if transportation_total > 1500:
        recommendations.append({
            "category": "Transportation",
            "text": "Your transportation emissions are high. Consider using public transport, carpooling, or switching to an electric vehicle to significantly reduce emissions.",
            "impact": "High"
        })
    if electricity_emissions > 1500:
        recommendations.append({
            "category": "Electricity",
            "text": "Your home energy emissions are substantial. Switching to LED bulbs and installing solar panels could cut your home energy footprint in half.",
            "impact": "High"
        })
    if food_total > 1200:
        recommendations.append({
            "category": "Food",
            "text": "Reducing red meat and dairy consumption, and incorporating more plant-based meals can heavily lower your food carbon emissions.",
            "impact": "Medium"
        })
    if water_total > 300:
        recommendations.append({
            "category": "Water",
            "text": "Installing low-flow showerheads, fixing household leaks, and reducing shower time can significantly decrease your indirect water emissions.",
            "impact": "Low"
        })
    if waste_total > 100:
        recommendations.append({
            "category": "Waste",
            "text": "Increase your recycling rate and set up a home composting bin for organic food scraps to minimize landfill gas emissions.",
            "impact": "Medium"
        })
    if shopping_total > 500:
        recommendations.append({
            "category": "Shopping",
            "text": "Avoid unnecessary purchases, buy second-hand when possible, and consolidate online shopping deliveries to reduce packaging and delivery footprint.",
            "impact": "Medium"
        })

    if not recommendations:
        recommendations.append({
            "category": "General",
            "text": "Keep up the excellent sustainable habits! To go even further, support local environmental initiatives or invest in green energy projects.",
            "impact": "Low"
        })

    ai_summary = get_ai_summary(data, total_carbon_footprint, sustainability_score, rating, breakdown)

    return {
        "totalCarbonFootprint": total_carbon_footprint,
        "unit": "kg CO2/year",
        "transportation": round(transportation_total),
        "electricity": round(electricity_emissions),
        "food": round(food_total),
        "water": round(water_total),
        "waste": round(waste_total),
        "shopping": round(shopping_total),
        "sustainabilityScore": sustainability_score,
        "rating": rating,
        "breakdown": breakdown,
        "recommendations": recommendations,
        "ai_summary": ai_summary
    }

def get_rule_based_summary(data: dict, total_carbon_footprint: int, score: int, rating: str, breakdown: dict) -> str:
    name = data.get("name", "User")
    work_type = data.get("workType", "Office")
    
    highest_cat = max(breakdown, key=breakdown.get)
    highest_val = breakdown[highest_cat]
    
    summary = f"Hello {name}! Based on your lifestyle questionnaire, your personal annual carbon footprint is **{total_carbon_footprint:,} kg CO2/year**, which earns you a **{score}/100 Sustainability Score** with a rating of **{rating}**.\n\n"
    summary += f"Your highest emission contributor is **{highest_cat.capitalize()}** at **{highest_val:,} kg CO2/year**. "
    
    if highest_cat == "transportation":
        summary += "This is primarily due to your commuting and travel choices. Swapping private car trips for walking, cycling, or public transport will yield direct environmental benefits."
    elif highest_cat == "electricity":
        summary += "This stems from electricity usage in your household. Using solar panels, switching to LED lighting, and running air conditioning only when needed are excellent mitigation paths."
    elif highest_cat == "food":
        summary += "This is driven by dietary choices and food waste habits. Shifting toward more plant-based alternatives and planning meals to cut down food waste can heavily lower this footprint."
    elif highest_cat == "shopping":
        summary += "This relates to your clothing, online packaging, and electronic device purchases. Adopting circular shopping habits, prioritizing durable goods, and buying only what is necessary will help curb this."
    else:
        summary += "Managing your daily resource consumption and disposal habits is key to reducing this category's impact."
        
    summary += f"\n\nSince you work as a **{work_type}** professional, you have unique opportunities to optimize your daily routine. "
    
    if score >= 75:
        summary += "You are already displaying exemplary green practices. Keep leading by example and sharing your sustainable choices with others in your community!"
    else:
        summary += "There are several actionable, low-cost steps you can take to move towards a cleaner lifestyle. Review our top recommendations below to begin your green journey."
        
    return summary

def get_ai_summary(data: dict, total_carbon_footprint: int, score: int, rating: str, breakdown: dict) -> str:
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    
    prompt = f"""
You are EcoHub AI, an expert Sustainability Consultant and Climate Advisor.
Analyze the user's lifestyle profile and carbon footprint outputs:
- Name: {data.get("name", "User")}
- Age: {data.get("age", "N/A")}
- City/Country: {data.get("city", "N/A")}, {data.get("country", "N/A")}
- Work Type: {data.get("workType", "N/A")}
- Total Carbon Footprint: {total_carbon_footprint} kg CO2/year
- Sustainability Score: {score}/100
- Rating: {rating}
- Breakdown (kg CO2/year): {breakdown}

Write a short, engaging, and professional 150-200 word sustainability summary. Address the user directly by name.
Acknowledge their strengths, highlight the biggest areas of concern, and provide direct motivation to adopt the recommended changes.
Keep it structured, positive, and inspiring. Return ONLY the markdown text.
Do not mention that you are a language model.
"""
    
    if openai_key:
        try:
            import openai
            if hasattr(openai, "OpenAI"):
                client = openai.OpenAI(api_key=openai_key)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300
                )
                return response.choices[0].message.content.strip()
            else:
                openai.api_key = openai_key
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300
                )
                return response.choices[0].message.content.strip()
        except Exception:
            pass
            
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            response = client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=prompt
            )
            return response.text.strip()
        except Exception:
            pass
            
    return get_rule_based_summary(data, total_carbon_footprint, score, rating, breakdown)

# Matplotlib Charts Generator
def generate_matplotlib_charts(result_data: dict) -> tuple:
    breakdown = result_data.get("breakdown", {})
    labels = [k.capitalize() for k in breakdown.keys()]
    values = list(breakdown.values())
    
    pie_labels = []
    pie_values = []
    for l, v in zip(labels, values):
        if v > 0:
            pie_labels.append(l)
            pie_values.append(v)
            
    # Draw Pie Chart
    fig, ax = plt.subplots(figsize=(4.5, 3.5))
    colors_scheme = ['#10B981', '#14B8A6', '#06B6D4', '#3B82F6', '#EF4444', '#F59E0B']
    ax.pie(pie_values, labels=pie_labels, autopct='%1.1f%%', startangle=140, colors=colors_scheme[:len(pie_values)])
    ax.axis('equal')
    plt.title("Carbon Footprint Breakdown", fontsize=12, fontweight='bold', pad=15)
    plt.tight_layout()
    
    pie_buf = io.BytesIO()
    plt.savefig(pie_buf, format='png', dpi=150)
    pie_buf.seek(0)
    plt.close()
    
    # Draw Bar Chart
    fig, ax = plt.subplots(figsize=(5.5, 3.5))
    ax.bar(labels, values, color='#10B981', edgecolor='#059669', width=0.5)
    ax.set_ylabel("Emissions (kg CO2/year)", fontsize=10)
    ax.set_title("Category Emissions Comparison", fontsize=12, fontweight='bold', pad=15)
    plt.xticks(rotation=15)
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout()
    
    bar_buf = io.BytesIO()
    plt.savefig(bar_buf, format='png', dpi=150)
    bar_buf.seek(0)
    plt.close()
    
    return pie_buf, bar_buf

# PDF Report Generator
def generate_pdf_report(user_data: dict, result_data: dict) -> io.BytesIO:
    try:
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
    except ImportError:
        raise ImportError("ReportLab is required for PDF report generation. Please install reportlab.")

    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#10B981'),
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        textColor=colors.HexColor('#111827'),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#4B5563'),
        leading=14,
        spaceAfter=8
    )
    
    bold_body_style = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=6
    )

    story = []
    
    # 1. Header Title
    story.append(Paragraph("🌍 EcoHub AI Sustainability Report", title_style))
    story.append(Paragraph("<b>Personal Carbon Footprint Assessment</b>", body_style))
    story.append(Spacer(1, 10))
    
    # 2. User Profile Info
    user_info_data = [
        [Paragraph("<b>User Profile</b>", bold_body_style), ""],
        [Paragraph("Name:", bold_body_style), Paragraph(str(user_data.get('name', 'User')), body_style)],
        [Paragraph("Age:", bold_body_style), Paragraph(str(user_data.get('age', 'N/A')), body_style)],
        [Paragraph("Location:", bold_body_style), Paragraph(f"{user_data.get('city', 'N/A')}, {user_data.get('country', 'N/A')}", body_style)],
        [Paragraph("Family Size:", bold_body_style), Paragraph(str(user_data.get('familySize', '1')), body_style)],
        [Paragraph("Work Setting:", bold_body_style), Paragraph(str(user_data.get('workType', 'Office')), body_style)]
    ]
    user_info_table = Table(user_info_data, colWidths=[120, 380])
    user_info_table.setStyle(TableStyle([
        ('SPAN', (0, 0), (1, 0)),
        ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#F3F4F6')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#E5E7EB')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB')),
    ]))
    story.append(user_info_table)
    story.append(Spacer(1, 15))
    
    # 3. Overall Results
    results_data = [
        [
            Paragraph("<b>Sustainability Score</b>", bold_body_style),
            Paragraph("<b>Carbon Footprint</b>", bold_body_style),
            Paragraph("<b>Rating Status</b>", bold_body_style)
        ],
        [
            Paragraph(f"<font size=18 color='#10B981'><b>{result_data.get('sustainabilityScore')}/100</b></font>", body_style),
            Paragraph(f"<font size=18 color='#4B5563'><b>{result_data.get('totalCarbonFootprint'):,}</b> kg CO₂/yr</font>", body_style),
            Paragraph(f"<font size=18 color='#F59E0B'><b>{result_data.get('rating')}</b></font>", body_style)
        ]
    ]
    results_table = Table(results_data, colWidths=[166, 166, 166])
    results_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F9FAFB')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB')),
        ('INNERGRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB')),
    ]))
    story.append(results_table)
    story.append(Spacer(1, 15))
    
    # 4. Table Breakdown
    story.append(Paragraph("Carbon Footprint Breakdown", section_style))
    breakdown = result_data.get("breakdown", {})
    total = result_data.get("totalCarbonFootprint", 1)
    
    table_rows = [
        [Paragraph("<b>Category</b>", bold_body_style), Paragraph("<b>Emissions (kg CO₂/year)</b>", bold_body_style), Paragraph("<b>Percentage</b>", bold_body_style)]
    ]
    for cat, val in breakdown.items():
        pct = (val / total) * 100
        table_rows.append([
            Paragraph(cat.capitalize(), body_style),
            Paragraph(f"{val:,}", body_style),
            Paragraph(f"{pct:.1f}%", body_style)
        ])
        
    breakdown_table = Table(table_rows, colWidths=[150, 200, 150])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#D1D5DB')),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB')),
    ]))
    story.append(breakdown_table)
    
    # Page Break for charts & summaries
    story.append(PageBreak())
    
    # 5. Render Matplotlib charts
    try:
        pie_buf, bar_buf = generate_matplotlib_charts(result_data)
        chart_data = [
            [Image(pie_buf, width=220, height=170), Image(bar_buf, width=260, height=170)]
        ]
        chart_table = Table(chart_data, colWidths=[240, 260])
        chart_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(Paragraph("Visual Analysis", section_style))
        story.append(chart_table)
        story.append(Spacer(1, 10))
    except Exception as e:
        story.append(Paragraph(f"Charts unavailable: {str(e)}", body_style))
        
    # 6. Consultant Statement / AI summary
    story.append(Paragraph("Sustainability Summary", section_style))
    summary_text = result_data.get("ai_summary", "")
    parts = summary_text.split("**")
    new_parts = []
    for i, part in enumerate(parts):
        if i % 2 == 1:
            new_parts.append(f"<b>{part}</b>")
        else:
            new_parts.append(part)
    clean_summary = "".join(new_parts).replace("\n\n", "<br/><br/>")
    story.append(Paragraph(clean_summary, body_style))
    story.append(Spacer(1, 10))
    
    # 7. Recommendations
    story.append(Paragraph("Targeted Recommendations", section_style))
    for rec in result_data.get("recommendations", []):
        cat = rec.get("category", "")
        text = rec.get("text", "")
        impact = rec.get("impact", "Medium")
        
        impact_color = "#10B981"
        if impact == "High":
            impact_color = "#EF4444"
        elif impact == "Medium":
            impact_color = "#F59E0B"
            
        story.append(Paragraph(
            f"<b>• [{cat}]</b> <font color='{impact_color}'><b>(Impact: {impact})</b></font> — {text}",
            bullet_style
        ))
        
    doc.build(story)
    return pdf_buffer
