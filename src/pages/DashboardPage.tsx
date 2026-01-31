import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { RawTextView } from '../components/RawTextView';
import ExcelJS from 'exceljs';

// Columns to extract from EVV_Accepted_Visits
const EVV_ACCEPTED_COLUMNS = [
  'Visit ID',
  'Provider Legal Name',
  'Medicaid ID',
  'Member First Name',
  'Member Last Name',
  'Payer Name',
  'HCPCS Code',
  'Modifiers',
  'Visit Date',
  'EVV Bill Hours',
  'Billable Units'
];

// Columns to extract from EVV_Claim_Search
const EVV_CLAIM_COLUMNS = [
  'Visit ID',
  'Claim Detail From Date',
  'Medicaid ID',
  'Member Last Name',
  'HCPCS',
  'Modifiers',
  'Claim Units',
  'NPI/API',
  'Service Provider ID',
  'Payer Name'
];

interface TabData {
  id: string;
  title: string;
  data: any[][];
  headers: string[];
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [evvAcceptedFile, setEvvAcceptedFile] = useState<File | null>(null);
  const [evvClaimFile, setEvvClaimFile] = useState<File | null>(null);
  const [dragActive1, setDragActive1] = useState(false);
  const [dragActive2, setDragActive2] = useState(false);
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);
  
  // State for processed data - now supports multiple tabs
  const [processedTabs, setProcessedTabs] = useState<TabData[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e: React.DragEvent, setDragActive: (v: boolean) => void, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(active);
  };

  const handleDrop = (e: React.DragEvent, setFile: (f: File | null) => void, setDragActive: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void, inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Helper function to extract data from Excel file
  const extractExcelData = async (file: File, columns: string[]): Promise<{ headers: string[]; data: any[][] }> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in the file');
    }

    // Get header row
    const headerRow = worksheet.getRow(1);
    const allHeaders: string[] = [];
    const columnIndices: { [key: string]: number } = {};
    
    headerRow.eachCell((cell, colNumber) => {
      const cellValue = cell.value?.toString().trim() || '';
      allHeaders.push(cellValue);
      columnIndices[cellValue] = colNumber;
    });

    // Determine which columns to extract
    const targetColumns = columns.length > 0 ? columns : allHeaders;
    
    // Extract data rows
    const extractedData: any[][] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      const rowData: any[] = targetColumns.map(colName => {
        const colIndex = columnIndices[colName];
        if (colIndex) {
          const cell = row.getCell(colIndex);
          return cell.value ?? '';
        }
        return '';
      });
      
      extractedData.push(rowData);
    });

    return { headers: targetColumns, data: extractedData };
  };

  // Process Excel files
  const handleProcessFiles = async () => {
    if (!evvAcceptedFile || !evvClaimFile) return;
    
    setIsProcessing(true);
    try {
      // Process both files in parallel
      const [acceptedResult, claimResult] = await Promise.all([
        extractExcelData(evvAcceptedFile, EVV_ACCEPTED_COLUMNS),
        extractExcelData(evvClaimFile, EVV_CLAIM_COLUMNS)
      ]);

      // Sort Accepted_Visits data by Payer Name (ASC) -> Medicaid ID (ASC) -> Visit Date (ASC)
      const payerNameIdx = acceptedResult.headers.indexOf('Payer Name');
      const medicaidIdIdx = acceptedResult.headers.indexOf('Medicaid ID');
      const visitDateIdx = acceptedResult.headers.indexOf('Visit Date');

      const sortedAcceptedData = [...acceptedResult.data].sort((a, b) => {
        // Sort by Payer Name first
        const payerA = String(a[payerNameIdx] || '').toLowerCase();
        const payerB = String(b[payerNameIdx] || '').toLowerCase();
        if (payerA !== payerB) return payerA.localeCompare(payerB);

        // Then by Medicaid ID
        const medicaidA = String(a[medicaidIdIdx] || '');
        const medicaidB = String(b[medicaidIdIdx] || '');
        if (medicaidA !== medicaidB) return medicaidA.localeCompare(medicaidB);

        // Then by Visit Date
        const dateA = a[visitDateIdx];
        const dateB = b[visitDateIdx];
        // Handle Date objects or strings
        const timeA = dateA instanceof Date ? dateA.getTime() : new Date(String(dateA)).getTime();
        const timeB = dateB instanceof Date ? dateB.getTime() : new Date(String(dateB)).getTime();
        return timeA - timeB;
      });

      const tabs: TabData[] = [
        {
          id: 'accepted',
          title: 'Accepted_Visits',
          headers: acceptedResult.headers,
          data: sortedAcceptedData
        },
        {
          id: 'claim',
          title: 'Claim_Search',
          headers: claimResult.headers,
          data: claimResult.data
        }
      ];

      setProcessedTabs(tabs);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check the file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const UploadBox = ({
    file,
    setFile,
    dragActive,
    setDragActive,
    inputRef,
    label,
    icon,
  }: {
    file: File | null;
    setFile: (f: File | null) => void;
    dragActive: boolean;
    setDragActive: (v: boolean) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    label: string;
    icon: 'accepted' | 'search';
  }) => (
    <div 
      className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
        file 
          ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-400 shadow-lg shadow-green-100' 
          : 'bg-white border-2 border-transparent shadow-lg hover:shadow-xl'
      }`}
    >
      {/* Header with gradient */}
      <div className={`px-6 py-4 ${file ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
        <div className="flex items-center gap-3">
          {icon === 'accepted' ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <h2 className="text-lg font-bold text-white">{label}</h2>
        </div>
      </div>
      
      {/* Upload area */}
      <div
        className={`p-6 transition-colors ${dragActive ? 'bg-blue-50' : ''}`}
        onDragEnter={(e) => handleDrag(e, setDragActive, true)}
        onDragLeave={(e) => handleDrag(e, setDragActive, false)}
        onDragOver={(e) => handleDrag(e, setDragActive, true)}
        onDrop={(e) => handleDrop(e, setFile, setDragActive)}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => handleFileChange(e, setFile, inputRef)}
          className="hidden"
        />
        
        <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive ? 'border-blue-400 bg-blue-50 scale-[1.02]' : file ? 'border-green-300' : 'border-gray-200 hover:border-gray-300'
        }`}>
          {file ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-800 font-semibold text-lg mb-1">{file.name}</p>
              <p className="text-gray-500 text-sm mb-4">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={() => setFile(null)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
              >
                ✕ Remove File
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">Drag and drop your Excel file here</p>
              <button
                onClick={() => inputRef.current?.click()}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Browse Files
              </button>
              <p className="text-gray-400 text-sm mt-4">Supports .xlsx and .xls files</p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Excel Combinator
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-gray-600">
              Hello, <span className="font-semibold text-gray-800">{user?.username}</span>
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload Your Files</h2>
          <p className="text-gray-500">Select two Excel files to combine them into one</p>
        </div>

        {/* Upload Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UploadBox
            file={evvAcceptedFile}
            setFile={setEvvAcceptedFile}
            dragActive={dragActive1}
            setDragActive={setDragActive1}
            inputRef={inputRef1}
            label="EVV_Accepted_Visits"
            icon="accepted"
          />
          <UploadBox
            file={evvClaimFile}
            setFile={setEvvClaimFile}
            dragActive={dragActive2}
            setDragActive={setDragActive2}
            inputRef={inputRef2}
            label="EVV_Claim_Search"
            icon="search"
          />
        </div>

        {/* Process Button */}
        <div className="mt-10 flex justify-end">
          <button 
            disabled={!evvAcceptedFile || !evvClaimFile || isProcessing}
            onClick={handleProcessFiles}
            className={`px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 ${
              evvAcceptedFile && evvClaimFile && !isProcessing
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Process Files
              </>
            )}
          </button>
        </div>

        {/* Status indicator */}
        <div className="mt-6 flex justify-end">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${evvAcceptedFile ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={evvAcceptedFile ? 'text-green-600 font-medium' : 'text-gray-400'}>EVV_Accepted_Visits</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${evvClaimFile ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={evvClaimFile ? 'text-green-600 font-medium' : 'text-gray-400'}>EVV_Claim_Search</span>
            </div>
          </div>
        </div>
      </main>

      {/* Processed Data View - Full Screen Modal with Tabs */}
      {processedTabs && (
        <RawTextView 
          tabs={processedTabs}
          onClose={() => setProcessedTabs(null)}
        />
      )}
    </div>
  );
}
