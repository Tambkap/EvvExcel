import { useState } from 'react';

interface TabData {
  id: string;
  title: string;
  data: any[][];
  headers: string[];
}

interface RawTextViewProps {
  tabs: TabData[];
  onClose?: () => void;
}

export function RawTextView({ tabs, onClose }: RawTextViewProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (!tabs || tabs.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
          <h3 className="text-lg font-bold text-gray-800 mb-4">No Data</h3>
          <div className="text-center py-8 text-gray-400">
            No data available
          </div>
          {onClose && (
            <button onClick={onClose} className="mt-4 w-full py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  const tableHeaders = activeTabData?.headers || [];
  const tableData = activeTabData?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col">
      {/* Full screen container */}
      <div className="flex-1 flex flex-col m-2 sm:m-4 lg:m-6 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with Tabs */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 flex-shrink-0">
          {/* Top bar */}
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/20">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-white">Processed Data</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline text-blue-100 text-sm bg-white/20 px-3 py-1 rounded-full">
                {tableData.length.toLocaleString()} rows × {tableHeaders.length} columns
              </span>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="px-4 sm:px-6 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-3 font-semibold text-sm sm:text-base transition-all rounded-t-xl ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.id === 'accepted' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">{tab.title}</span>
                  <span className="sm:hidden">{tab.title.replace('EVV_', '').replace('_', ' ')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white'
                  }`}>
                    {tab.data.length.toLocaleString()}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Container - fills remaining space */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b sticky left-0 z-20">
                  #
                </th>
                {tableHeaders.map((header, index) => (
                  <th
                    key={index}
                    className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b whitespace-nowrap"
                  >
                    {header || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.map((row, rowIndex) => {
                // Check if this is a group header row (for CLAIMS FOR INVESTIGATION tab)
                const isPayerHeader = (row as any)._isGroupHeader === 'payer';
                const isMedicaidHeader = (row as any)._isGroupHeader === 'medicaid';
                const isGroupHeader = isPayerHeader || isMedicaidHeader;

                if (isGroupHeader) {
                  return (
                    <tr 
                      key={rowIndex} 
                      className={isPayerHeader 
                        ? "bg-green-100 border-t-2 border-green-400" 
                        : "bg-yellow-50 border-t border-yellow-300"
                      }
                    >
                      <td className="px-3 sm:px-4 py-2 text-gray-400 text-xs font-mono bg-gray-50/50 sticky left-0">
                        
                      </td>
                      <td
                        colSpan={tableHeaders.length}
                        className={`px-3 sm:px-4 py-2 font-bold whitespace-nowrap ${
                          isPayerHeader ? 'text-green-800 text-sm' : 'text-yellow-800 text-sm'
                        }`}
                      >
                        {row[0]}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr 
                    key={rowIndex} 
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-3 sm:px-4 py-3 text-gray-400 text-xs font-mono bg-gray-50/50 sticky left-0">
                      {rowIndex + 1}
                    </td>
                    {tableHeaders.map((_, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-3 sm:px-4 py-3 text-gray-700 whitespace-nowrap"
                      >
                        {row[colIndex] !== undefined && row[colIndex] !== null
                          ? String(row[colIndex])
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t text-sm text-gray-500 flex items-center justify-between flex-shrink-0">
          <span>
            <span className="font-medium text-gray-700">{activeTabData?.title}</span>
            {' '}- Showing {tableData.length.toLocaleString()} rows
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-gray-400">Scroll to view more →</span>
            {onClose && (
              <button 
                onClick={onClose}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
