
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface ReportData {
  meetings: any[];
  documents: any[];
  polls: any[];
  attendance: any[];
  members: any[];
  document_analytics: any[];
}

export const useReports = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateReport = async (reportType: string, dateRange?: { start: Date; end: Date }) => {
    setLoading(true);
    try {
      let data: any = {};

      // Fetch data based on report type
      switch (reportType) {
        case 'meetings':
          const { data: meetings } = await supabase
            .from('meetings')
            .select(`
              *,
              meeting_attendees(user_id, status),
              profiles!meetings_created_by_fkey(first_name, last_name)
            `)
            .order('start_time', { ascending: false });
          data = meetings || [];
          break;

        case 'documents':
          const { data: documents } = await supabase
            .from('documents')
            .select(`
              *,
              profiles!documents_uploaded_by_fkey(first_name, last_name),
              document_views(view_started_at, time_spent_seconds)
            `)
            .order('created_at', { ascending: false });
          data = documents || [];
          break;

        case 'document_analytics':
          const { data: documentAnalytics } = await supabase
            .from('document_views')
            .select(`
              *,
              documents(name, folder),
              profiles!document_views_user_id_fkey(first_name, last_name, email)
            `)
            .order('view_started_at', { ascending: false });
          data = documentAnalytics || [];
          break;

        case 'voting':
          const { data: polls } = await supabase
            .from('polls')
            .select(`
              *,
              poll_votes(vote, voted_at),
              profiles!polls_created_by_fkey(first_name, last_name)
            `)
            .order('created_at', { ascending: false });
          data = polls || [];
          break;

        case 'comprehensive':
          const [meetingsRes, documentsRes, pollsRes, analyticsRes] = await Promise.all([
            supabase.from('meetings').select('*').order('start_time', { ascending: false }),
            supabase.from('documents').select('*').order('created_at', { ascending: false }),
            supabase.from('polls').select('*').order('created_at', { ascending: false }),
            supabase.from('document_views').select(`
              *,
              documents(name, folder),
              profiles!document_views_user_id_fkey(first_name, last_name, email)
            `).order('view_started_at', { ascending: false })
          ]);
          
          data = {
            meetings: meetingsRes.data || [],
            documents: documentsRes.data || [],
            polls: pollsRes.data || [],
            document_analytics: analyticsRes.data || []
          };
          break;
      }

      return data;
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Report Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) {
      toast({
        title: "No Data",
        description: "No data available to download",
        variant: "destructive"
      });
      return;
    }

    // Convert data to CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle nested objects and arrays
          if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: `${filename}.csv downloaded successfully`
    });
  };

  const downloadPDF = async (data: any, reportType: string) => {
    // For now, we'll create a simple HTML report that can be printed as PDF
    const htmlContent = generateHTMLReport(data, reportType);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Auto-trigger print dialog
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }

    toast({
      title: "PDF Report",
      description: "Print dialog opened. Choose 'Save as PDF' in print options."
    });
  };

  const generateHTMLReport = (data: any, reportType: string) => {
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ISKCON Bureau Report - ${reportType}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 100px; margin: 0 auto 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/lovable-uploads/7ccf6269-31c1-46b9-bc5c-60b58a22c03e.png" alt="ISKCON Logo" class="logo">
            <h1>ISKCON Bureau Management</h1>
            <h2>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h2>
            <p>Generated on: ${currentDate}</p>
          </div>
          
          <div class="summary">
            <h3>Summary</h3>
            <p>Total Records: ${Array.isArray(data) ? data.length : Object.values(data).reduce((acc: number, val: any) => acc + (Array.isArray(val) ? val.length : 0), 0)}</p>
          </div>
          
          ${generateReportContent(data, reportType)}
        </body>
      </html>
    `;
  };

  const generateReportContent = (data: any, reportType: string) => {
    if (reportType === 'comprehensive') {
      return Object.entries(data).map(([key, values]: [string, any]) => `
        <h3>${key.charAt(0).toUpperCase() + key.slice(1)}</h3>
        ${generateTableFromArray(values as any[])}
      `).join('');
    } else {
      return generateTableFromArray(data);
    }
  };

  const generateTableFromArray = (array: any[]) => {
    if (!array.length) return '<p>No data available</p>';
    
    const headers = Object.keys(array[0]);
    return `
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${header.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${array.map(row => `
            <tr>
              ${headers.map(header => {
                const value = row[header];
                if (typeof value === 'object' && value !== null) {
                  return `<td>${JSON.stringify(value)}</td>`;
                }
                return `<td>${value || ''}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  return {
    loading,
    generateReport,
    downloadCSV,
    downloadPDF
  };
};
