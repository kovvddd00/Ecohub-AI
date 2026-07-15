import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Globe,
  User,
  Car,
  Zap,
  Coffee,
  Droplet,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  AlertTriangle,
  History,
  CheckCircle,
  Leaf
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// API base endpoint from app context
import { API_BASE } from '../context/AppContext';

interface Recommendation {
  category: string;
  text: string;
  impact: 'High' | 'Medium' | 'Low';
}

interface CarbonResult {
  id?: string;
  totalCarbonFootprint: number;
  unit: string;
  transportation: number;
  electricity: number;
  food: number;
  water: number;
  waste: number;
  shopping: number;
  sustainabilityScore: number;
  rating: string;
  breakdown: {
    transportation: number;
    electricity: number;
    food: number;
    water: number;
    waste: number;
    shopping: number;
  };
  recommendations: Recommendation[];
  ai_summary: string;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  name: string;
  age: number;
  country: string;
  city: string;
  totalCarbonFootprint: number;
  sustainabilityScore: number;
  rating: string;
}

export const PersonaCarbo: React.FC = () => {
  const { isLoading: globalLoading } = useApp();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'dashboard' | 'history'>('form');
  const [result, setResult] = useState<CarbonResult | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Form State variables
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    name: '',
    age: '',
    country: '',
    city: '',
    familySize: '1',
    workType: 'Office',
    
    // Step 2: Transportation
    vehicleType: 'None',
    kmTravelledPerWeek: '',
    flightsPerYear: '',
    publicTransportUsage: 'Never',
    
    // Step 3: Electricity
    monthlyElectricityKwh: '',
    monthlyElectricityBill: '',
    acUnits: '0',
    acUsageHoursPerDay: '',
    ledBulbs: 'No',
    solarPanels: 'No',
    
    // Step 4: Food
    dietType: 'Vegetarian',
    meatMealsPerWeek: '',
    milkConsumption: 'Medium',
    foodWaste: 'Medium',
    
    // Step 5: Water
    dailyWaterUsage: '',
    showerDuration: 'Medium',
    washingMachineUsagePerWeek: '',
    
    // Step 6: Waste
    plasticWaste: 'Medium',
    recycling: 'Sometimes',
    composting: 'No',
    
    // Step 7: Shopping
    clothesPurchasedPerMonth: '',
    onlineOrdersPerMonth: '',
    electronicsPurchasedPerYear: ''
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/persona-carbo/history`);
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.error('Failed to load carbon footprint history', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = () => {
    if (step < 7) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Format fields as appropriate types
    const payload = {
      ...formData,
      age: formData.age ? parseInt(formData.age) : 25,
      familySize: parseInt(formData.familySize),
      kmTravelledPerWeek: formData.kmTravelledPerWeek ? parseFloat(formData.kmTravelledPerWeek) : 0,
      flightsPerYear: formData.flightsPerYear ? parseFloat(formData.flightsPerYear) : 0,
      monthlyElectricityKwh: formData.monthlyElectricityKwh ? parseFloat(formData.monthlyElectricityKwh) : null,
      monthlyElectricityBill: formData.monthlyElectricityBill ? parseFloat(formData.monthlyElectricityBill) : null,
      acUnits: parseInt(formData.acUnits),
      acUsageHoursPerDay: formData.acUsageHoursPerDay ? parseFloat(formData.acUsageHoursPerDay) : 0,
      meatMealsPerWeek: formData.meatMealsPerWeek ? parseFloat(formData.meatMealsPerWeek) : 0,
      dailyWaterUsage: formData.dailyWaterUsage ? parseFloat(formData.dailyWaterUsage) : 150,
      washingMachineUsagePerWeek: formData.washingMachineUsagePerWeek ? parseFloat(formData.washingMachineUsagePerWeek) : 3,
      clothesPurchasedPerMonth: formData.clothesPurchasedPerMonth ? parseFloat(formData.clothesPurchasedPerMonth) : 2,
      onlineOrdersPerMonth: formData.onlineOrdersPerMonth ? parseFloat(formData.onlineOrdersPerMonth) : 4,
      electronicsPurchasedPerYear: formData.electronicsPurchasedPerYear ? parseFloat(formData.electronicsPurchasedPerYear) : 1
    };

    try {
      const response = await fetch(`${API_BASE}/persona-carbo/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to compute carbon footprint assessment');
      }

      const data: CarbonResult = await response.json();
      setResult(data);
      setViewMode('dashboard');
      fetchHistory(); // Refresh history
    } catch (err: any) {
      setError(err.message || 'Calculation request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadHistoryRecord = async (id: string) => {
    setIsSubmitting(true);
    setSelectedHistoryId(id);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/persona-carbo/history`);
      if (response.ok) {
        // Find in local history items
        const item = historyList.find(h => h.id === id);
        // Fetch detailed report by getting the history report endpoint or querying lists
        // Since sqlite saves both input and output in user_data and result_data:
        // We can fetch details via standard list
        const detailedResponse = await fetch(`${API_BASE}/persona-carbo/history`);
        if (detailedResponse.ok) {
          // Since history returns brief info, we will fetch detailed info
          // Wait, let's look at the database helper. We need report_by_id!
          // We can construct a detailed retrieve endpoint or fetch from database
          // Wait, we have report/{id} which returns PDF, but we can also modify backend or fetch
          // the specific assessment results.
          // Wait, we saved user_data and result_data in SQLite.
          // Let's call a GET /api/persona-carbo/report/{id} or we can add a GET /api/persona-carbo/assessment/{id} if needed.
          // Wait! Let's check: does main.py have an assessment retrieve endpoint?
          // No, main.py only has:
          // POST /api/persona-carbo/calculate
          // GET /api/persona-carbo/history
          // GET /api/persona-carbo/report/{id} (PDF streaming)
          // Wait! Can we retrieve the result details?
          // Ah! Let's check: in persona_carbo.py, we have `get_report_by_id(report_id)` which returns a dict:
          // `{"user_data": ..., "result_data": ..., "timestamp": ...}`
          // Yes! If we create a GET /api/persona-carbo/assessment/{id} endpoint in `main.py` we can fetch the detailed assessment!
          // Let's check if we should do that, or we can just update `main.py` to add that endpoint.
          // Yes, adding a simple GET endpoint `/api/persona-carbo/assessment/{id}` to fetch the raw JSON result is extremely helpful and clean!
          // Let's modify main.py to add that, or we can add it to main.py later. Let's write the code in React assuming we have this endpoint. If not, we will add it to main.py right away.
          // Wait, let's write the frontend code to call GET `/api/persona-carbo/assessment/{id}`.
          const res = await fetch(`${API_BASE}/persona-carbo/assessment/${id}`);
          if (res.ok) {
            const data = await res.json();
            setResult(data.result_data);
            setFormData(data.user_data);
            setViewMode('dashboard');
          } else {
            throw new Error("Failed to load historical assessment details");
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (id?: string) => {
    if (!id && result?.id) {
      id = result.id;
    }
    if (!id) return;
    
    try {
      const url = `${API_BASE}/persona-carbo/report/${id}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not download report PDF");
      
      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', `persona_carbo_report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download PDF report. Ensure backend is running and ReportLab is installed.");
    }
  };

  const handleRetake = () => {
    setFormData({
      name: '',
      age: '',
      country: '',
      city: '',
      familySize: '1',
      workType: 'Office',
      vehicleType: 'None',
      kmTravelledPerWeek: '',
      flightsPerYear: '',
      publicTransportUsage: 'Never',
      monthlyElectricityKwh: '',
      monthlyElectricityBill: '',
      acUnits: '0',
      acUsageHoursPerDay: '',
      ledBulbs: 'No',
      solarPanels: 'No',
      dietType: 'Vegetarian',
      meatMealsPerWeek: '',
      milkConsumption: 'Medium',
      foodWaste: 'Medium',
      dailyWaterUsage: '',
      showerDuration: 'Medium',
      washingMachineUsagePerWeek: '',
      plasticWaste: 'Medium',
      recycling: 'Sometimes',
      composting: 'No',
      clothesPurchasedPerMonth: '',
      onlineOrdersPerMonth: '',
      electronicsPurchasedPerYear: ''
    });
    setStep(1);
    setResult(null);
    setViewMode('form');
  };

  // Recharts color palettes
  const BREAKDOWN_COLORS = {
    transportation: '#10B981', // Emerald
    electricity: '#3B82F6',    // Blue
    food: '#F59E0B',           // Amber
    water: '#06B6D4',          // Cyan
    waste: '#EF4444',          // Red
    shopping: '#8B5CF6'        // Purple
  };

  const chartColors = [
    BREAKDOWN_COLORS.transportation,
    BREAKDOWN_COLORS.electricity,
    BREAKDOWN_COLORS.food,
    BREAKDOWN_COLORS.water,
    BREAKDOWN_COLORS.waste,
    BREAKDOWN_COLORS.shopping
  ];

  // Helper rating badge color class
  const getRatingBadgeClass = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Good':
        return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
      case 'Average':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Needs Improvement':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Critical':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  // Custom SVG Gauge needle helper
  const renderGaugeNeedle = (value: number, cx: number, cy: number, iR: number, oR: number, color: string) => {
    // 0 is 180 degrees, 100 is 0 degrees.
    const angle = 180 - (value / 100) * 180;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-angle * RADIAN);
    const cos = Math.cos(-angle * RADIAN);
    const r = 5;
    const x0 = cx;
    const y0 = cy;
    const xba = x0 + r * sin;
    const yba = y0 - r * cos;
    const xbb = x0 - r * sin;
    const ybb = y0 + r * cos;
    const xp = x0 + (oR - 15) * cos;
    const yp = y0 + (oR - 15) * sin;

    return (
      <g>
        <path d={`M ${xba} ${yba} L ${xbb} ${ybb} L ${xp} ${yp} Z`} fill={color} />
        <circle cx={x0} cy={y0} r={r} fill={color} />
      </g>
    );
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-bold text-white">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold text-[var(--color-text)]">personaCarbo</h1>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
            Calculate your personal annual carbon footprint, obtain tailored recommendations, and view your history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode !== 'form' && (
            <button
              onClick={() => setViewMode('form')}
              className="btn btn-slate text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake / New Test
            </button>
          )}
          {viewMode !== 'history' ? (
            <button
              onClick={() => {
                setViewMode('history');
                fetchHistory();
              }}
              className="btn btn-slate text-xs flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              View History
            </button>
          ) : (
            <button
              onClick={() => setViewMode(result ? 'dashboard' : 'form')}
              className="btn btn-slate text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-[13px]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Error:</span> {error}
          </div>
        </div>
      )}

      {/* 1. FORM WIZARD VIEW */}
      {viewMode === 'form' && (
        <div className="max-w-2xl mx-auto card-base p-6 md:p-8 space-y-6">
          {/* Progress Header */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)]">
              <span className="font-medium text-emerald-400">Step {step} of 7</span>
              <span>
                {step === 1 && 'Personal Information'}
                {step === 2 && 'Transportation'}
                {step === 3 && 'Electricity'}
                {step === 4 && 'Food & Diet'}
                {step === 5 && 'Water Impact'}
                {step === 6 && 'Waste Management'}
                {step === 7 && 'Shopping Habits'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${(step / 7) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* STEP 1: PERSONAL INFORMATION */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">Step 1 — Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Kovid Bhujbal"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Age</label>
                    <input
                      type="number"
                      name="age"
                      placeholder="e.g. 24"
                      value={formData.age}
                      onChange={handleInputChange}
                      required
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Country</label>
                    <input
                      type="text"
                      name="country"
                      placeholder="e.g. India"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      name="city"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Family Size</label>
                    <input
                      type="number"
                      name="familySize"
                      min="1"
                      value={formData.familySize}
                      onChange={handleInputChange}
                      required
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Work Setting</label>
                    <select
                      name="workType"
                      value={formData.workType}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Work From Home">Work From Home (WFH)</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Office">In-Office</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: TRANSPORTATION */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Car className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">Step 2 — Transportation</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Primary Vehicle</label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="None">None</option>
                      <option value="Bicycle">Bicycle</option>
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Petrol Car">Petrol Car</option>
                      <option value="Diesel Car">Diesel Car</option>
                      <option value="CNG Car">CNG Car</option>
                      <option value="Electric Car">Electric Car</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Travel distance per week (km)</label>
                    <input
                      type="number"
                      name="kmTravelledPerWeek"
                      placeholder="e.g. 150"
                      value={formData.kmTravelledPerWeek}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Flights per year</label>
                    <input
                      type="number"
                      name="flightsPerYear"
                      placeholder="e.g. 2"
                      value={formData.flightsPerYear}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Public Transport Usage</label>
                    <select
                      name="publicTransportUsage"
                      value={formData.publicTransportUsage}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Never">Never</option>
                      <option value="Rarely">Rarely</option>
                      <option value="Sometimes">Sometimes</option>
                      <option value="Frequently">Frequently</option>
                      <option value="Daily">Daily</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: ELECTRICITY */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">Step 3 — Electricity</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Monthly Electricity Consumption (kWh)</label>
                    <input
                      type="number"
                      name="monthlyElectricityKwh"
                      placeholder="e.g. 250"
                      value={formData.monthlyElectricityKwh}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Monthly Bill (Optional)</label>
                    <input
                      type="number"
                      name="monthlyElectricityBill"
                      placeholder="e.g. 2000"
                      value={formData.monthlyElectricityBill}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Number of AC Units</label>
                    <input
                      type="number"
                      name="acUnits"
                      value={formData.acUnits}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">AC Usage (hours per day)</label>
                    <input
                      type="number"
                      name="acUsageHoursPerDay"
                      placeholder="e.g. 4"
                      value={formData.acUsageHoursPerDay}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">LED Bulbs Only?</label>
                    <select
                      name="ledBulbs"
                      value={formData.ledBulbs}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Solar Panels Installed?</label>
                    <select
                      name="solarPanels"
                      value={formData.solarPanels}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: FOOD */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Coffee className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">Step 4 — Food & Diet</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Diet Type</label>
                    <select
                      name="dietType"
                      value={formData.dietType}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Vegan">Vegan</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Eggetarian">Eggetarian</option>
                      <option value="Non Vegetarian">Non Vegetarian</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Meat Meals Per Week</label>
                    <input
                      type="number"
                      name="meatMealsPerWeek"
                      placeholder="e.g. 3"
                      value={formData.meatMealsPerWeek}
                      onChange={handleInputChange}
                      disabled={formData.dietType !== 'Non Vegetarian'}
                      className="input-base px-4 py-2.5 text-sm disabled:opacity-40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Milk/Dairy Consumption</label>
                    <select
                      name="milkConsumption"
                      value={formData.milkConsumption}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Estimated Food Waste</label>
                    <select
                      name="foodWaste"
                      value={formData.foodWaste}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: WATER */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Droplet className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">Step 5 — Water Impact</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Daily Water Usage (Liters)</label>
                    <input
                      type="number"
                      name="dailyWaterUsage"
                      placeholder="e.g. 150"
                      value={formData.dailyWaterUsage}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Average Shower Duration</label>
                    <select
                      name="showerDuration"
                      value={formData.showerDuration}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Short">Short (&lt; 5 mins)</option>
                      <option value="Medium">Medium (5-10 mins)</option>
                      <option value="Long">Long (&gt; 10 mins)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Washing Machine Loads per Week</label>
                    <input
                      type="number"
                      name="washingMachineUsagePerWeek"
                      placeholder="e.g. 3"
                      value={formData.washingMachineUsagePerWeek}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: WASTE */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Trash2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">Step 6 — Waste Management</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Plastic Waste Generation</label>
                    <select
                      name="plasticWaste"
                      value={formData.plasticWaste}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Recycling Habits</label>
                    <select
                      name="recycling"
                      value={formData.recycling}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Always">Always</option>
                      <option value="Sometimes">Sometimes</option>
                      <option value="Never">Never</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Do you practice organic composting?</label>
                    <select
                      name="composting"
                      value={formData.composting}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: SHOPPING */}
            {step === 7 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">Step 7 — Shopping & Consumption</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Clothes purchased per month</label>
                    <input
                      type="number"
                      name="clothesPurchasedPerMonth"
                      placeholder="e.g. 2"
                      value={formData.clothesPurchasedPerMonth}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Online deliveries per month</label>
                    <input
                      type="number"
                      name="onlineOrdersPerMonth"
                      placeholder="e.g. 5"
                      value={formData.onlineOrdersPerMonth}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">New electronic devices purchased per year</label>
                    <input
                      type="number"
                      name="electronicsPurchasedPerYear"
                      placeholder="e.g. 1"
                      value={formData.electronicsPurchasedPerYear}
                      onChange={handleInputChange}
                      className="input-base px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form Wizard Navigation Buttons */}
            <div className="flex justify-between border-t border-border pt-6 mt-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-slate text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 7 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  Next Step
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || globalLoading}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Computing footprint...
                    </>
                  ) : (
                    <>
                      Submit Questionnaire
                      <CheckCircle className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 2. RESULTS DASHBOARD VIEW */}
      {viewMode === 'dashboard' && result && (
        <div className="space-y-6">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-base p-6 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Total Carbon Footprint</span>
                <h2 className="text-3xl font-bold mt-2 text-[var(--color-text)]">
                  {result.totalCarbonFootprint.toLocaleString()}
                </h2>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] mt-2">kg CO₂ / year</span>
            </div>

            <div className="card-base p-6 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Sustainability Score</span>
                <h2 className="text-3xl font-bold mt-2 text-emerald-400">
                  {result.sustainabilityScore}/100
                </h2>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] mt-2">Higher is cleaner</span>
            </div>

            <div className="card-base p-6 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Eco Status Rating</span>
                <div className="mt-2">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide ${getRatingBadgeClass(result.rating)}`}>
                    {result.rating}
                  </span>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] mt-2">Based on annual emissions</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart: Carbon Breakdown */}
            <div className="card-base p-6 flex flex-col lg:col-span-1">
              <h3 className="font-semibold text-sm border-b border-border pb-3 mb-4">Carbon Breakdown</h3>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Transport', value: result.transportation },
                        { name: 'Electricity', value: result.electricity },
                        { name: 'Food', value: result.food },
                        { name: 'Water', value: result.water },
                        { name: 'Waste', value: result.waste },
                        { name: 'Shopping', value: result.shopping }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill={BREAKDOWN_COLORS.transportation} />
                      <Cell fill={BREAKDOWN_COLORS.electricity} />
                      <Cell fill={BREAKDOWN_COLORS.food} />
                      <Cell fill={BREAKDOWN_COLORS.water} />
                      <Cell fill={BREAKDOWN_COLORS.waste} />
                      <Cell fill={BREAKDOWN_COLORS.shopping} />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val) => [`${val.toLocaleString()} kg`, 'Emissions']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend */}
              <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] font-medium text-[var(--color-text-muted)]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BREAKDOWN_COLORS.transportation }} />
                  <span>Transport</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BREAKDOWN_COLORS.electricity }} />
                  <span>Electricity</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BREAKDOWN_COLORS.food }} />
                  <span>Food</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BREAKDOWN_COLORS.water }} />
                  <span>Water</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BREAKDOWN_COLORS.waste }} />
                  <span>Waste</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BREAKDOWN_COLORS.shopping }} />
                  <span>Shopping</span>
                </div>
              </div>
            </div>

            {/* Bar Chart: Category Comparison */}
            <div className="card-base p-6 flex flex-col lg:col-span-1">
              <h3 className="font-semibold text-sm border-b border-border pb-3 mb-4">Category Comparison</h3>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { category: 'Transport', emissions: result.transportation, fill: BREAKDOWN_COLORS.transportation },
                      { category: 'Energy', emissions: result.electricity, fill: BREAKDOWN_COLORS.electricity },
                      { category: 'Food', emissions: result.food, fill: BREAKDOWN_COLORS.food },
                      { category: 'Water', emissions: result.water, fill: BREAKDOWN_COLORS.water },
                      { category: 'Waste', emissions: result.waste, fill: BREAKDOWN_COLORS.waste },
                      { category: 'Shopping', emissions: result.shopping, fill: BREAKDOWN_COLORS.shopping }
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="category" stroke="#6B7280" fontSize={10} tickLine={false} />
                    <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val) => [`${val.toLocaleString()} kg CO2`, 'Emissions']}
                    />
                    <Bar dataKey="emissions" radius={[4, 4, 0, 0]}>
                      {[
                        { fill: BREAKDOWN_COLORS.transportation },
                        { fill: BREAKDOWN_COLORS.electricity },
                        { fill: BREAKDOWN_COLORS.food },
                        { fill: BREAKDOWN_COLORS.water },
                        { fill: BREAKDOWN_COLORS.waste },
                        { fill: BREAKDOWN_COLORS.shopping }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Custom SVG Score Gauge */}
            <div className="card-base p-6 flex flex-col lg:col-span-1 items-center justify-between text-center">
              <h3 className="font-semibold text-sm border-b border-border pb-3 w-full text-left mb-4">Sustainability Gauge</h3>
              <div className="relative w-full flex items-center justify-center pt-2">
                <svg width="220" height="130" viewBox="0 0 220 130">
                  {/* Gauge Arc background */}
                  <path
                    d="M 20 110 A 90 90 0 0 1 200 110"
                    fill="none"
                    stroke="#1F2937"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                  {/* Gauge active score Arc (Red -> Orange -> Emerald) */}
                  <path
                    d="M 20 110 A 90 90 0 0 1 200 110"
                    fill="none"
                    stroke="url(#gauge-gradient)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (result.sustainabilityScore / 100) * 283}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                  />
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EF4444" />     {/* Red */}
                      <stop offset="50%" stopColor="#F59E0B" />    {/* Orange */}
                      <stop offset="100%" stopColor="#10B981" />   {/* Emerald */}
                    </linearGradient>
                  </defs>
                  {/* Rotating needle */}
                  {renderGaugeNeedle(result.sustainabilityScore, 110, 110, 50, 90, '#FFFFFF')}
                </svg>
                {/* Visual Label */}
                <div className="absolute bottom-2 text-center">
                  <span className="text-3xl font-extrabold text-[var(--color-text)]">
                    {result.sustainabilityScore}
                  </span>
                  <div className="text-[10px] uppercase font-semibold text-[var(--color-text-dim)] tracking-wider mt-0.5">
                    Score
                  </div>
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-2">
                Your score places you in the <span className="font-semibold text-emerald-400">{result.rating}</span> tier.
              </div>
            </div>
          </div>

          {/* AI summary */}
          <div className="card-base p-6 bg-gradient-to-br from-[#111827] to-[#0d1c2b] border-emerald-500/20">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-sm text-white">Advisor AI Carbon Report</h3>
            </div>
            <div className="text-[13px] text-slate-300 leading-relaxed space-y-2 whitespace-pre-line">
              {renderFormattedText(result.ai_summary)}
            </div>
          </div>

          {/* Recommendations and PDF download */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card-base p-6 lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-sm border-b border-border pb-3">Actionable Climate Recommendations</h3>
              <div className="space-y-3">
                {result.recommendations.map((rec, idx) => {
                  const impactClass = rec.impact === 'High'
                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                    : rec.impact === 'Medium'
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 shrink-0 ${impactClass}`}>
                        {rec.impact} Impact
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-white">{rec.category}</div>
                        <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{rec.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-base p-6 lg:col-span-1 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Download Assessment Report</h3>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Export a clean PDF document containing your full personal profile, total footprint breakdowns, charts, and targeted sustainability recommendations.
                </p>
              </div>
              <button
                onClick={() => handleDownloadPdf()}
                className="w-full btn btn-primary flex items-center justify-center gap-2 text-xs py-3"
              >
                <Download className="w-4 h-4" />
                Download PDF Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. HISTORY TABLE VIEW */}
      {viewMode === 'history' && (
        <div className="card-base overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Carbon Assessment History</h3>
            <span className="text-xs text-[var(--color-text-muted)]">{historyList.length} assessment(s) found</span>
          </div>

          {historyList.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <History className="w-8 h-8 mx-auto text-[var(--color-text-dim)]" />
              <div className="font-medium text-sm text-[var(--color-text-muted)]">No past assessments found</div>
              <p className="text-xs text-[var(--color-text-dim)] max-w-xs mx-auto">
                Fill out the questionnaire form to calculate your first personal carbon footprint.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.01] border-b border-border text-[11px] font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Location</th>
                    <th className="p-4 text-right">Footprint</th>
                    <th className="p-4 text-center">Score</th>
                    <th className="p-4 text-center">Rating</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 font-medium text-[var(--color-text)]">{item.timestamp}</td>
                      <td className="p-4 text-[var(--color-text-muted)]">{item.name}</td>
                      <td className="p-4 text-[var(--color-text-muted)]">
                        {item.city}, {item.country}
                      </td>
                      <td className="p-4 text-right font-semibold text-white">
                        {item.totalCarbonFootprint.toLocaleString()} kg CO₂
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-400">
                        {item.sustainabilityScore}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getRatingBadgeClass(item.rating)}`}>
                          {item.rating}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleLoadHistoryRecord(item.id)}
                          disabled={isSubmitting && selectedHistoryId === item.id}
                          className="btn btn-slate text-[10px] px-2.5 py-1 hover:border-emerald-500/30 inline-flex items-center gap-1"
                        >
                          {isSubmitting && selectedHistoryId === item.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            'View'
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(item.id)}
                          className="btn btn-slate text-[10px] px-2.5 py-1 hover:border-emerald-500/30"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
