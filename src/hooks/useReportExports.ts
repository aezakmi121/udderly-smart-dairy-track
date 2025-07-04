
import { useToast } from '@/hooks/use-toast';

export const useReportExports = () => {
  const { toast } = useToast();

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    try {
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => 
          typeof row[header] === 'string' ? `"${row[header]}"` : row[header]
        ).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: `${filename} exported successfully!` });
    } catch (error) {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    }
  };

  return { exportToCSV };
};
