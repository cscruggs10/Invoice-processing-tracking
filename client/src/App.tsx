import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import DataEntry from "@/pages/data-entry";
import Review from "@/pages/review";
import AdminReview from "@/pages/admin-review";
import Export from "@/pages/export";
import SearchPage from "@/pages/search";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/upload" component={Upload} />
      <Route path="/entry" component={DataEntry} />
      <Route path="/review" component={Review} />
      <Route path="/admin" component={AdminReview} />
      <Route path="/approved">
        {() => <Review />} {/* Reuse review component but filter for approved */}
      </Route>
      <Route path="/export" component={Export} />
      <Route path="/search" component={SearchPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          
          <div className="md:ml-[280px]">
            <Navbar onToggleSidebar={toggleSidebar} />
            
            <main className="min-h-[calc(100vh-60px)]">
              <Router />
            </main>
          </div>
        </div>
        
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
