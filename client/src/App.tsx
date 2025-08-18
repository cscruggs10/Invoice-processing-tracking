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
import Approved from "@/pages/approved";
import Export from "@/pages/export";
import Search from "@/pages/search";
import ImportVerification from "@/pages/import-verification";
import ImportFailures from "@/pages/import-failures";
import Debug from "@/pages/debug";
import SimpleUpload from "@/pages/simple-upload";
import GLSearch from "@/pages/gl-search";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/upload" component={Upload} />
      <Route path="/entry" component={DataEntry} />
      <Route path="/review" component={Review} />
      <Route path="/admin" component={AdminReview} />
      <Route path="/approved" component={Approved} />
      <Route path="/export" component={Export} />
      <Route path="/import-verification" component={ImportVerification} />
      <Route path="/import-failures" component={ImportFailures} />
      <Route path="/search" component={Search} />
      <Route path="/gl-search" component={GLSearch} />
      <Route path="/debug" component={Debug} />
      <Route path="/simple-upload" component={SimpleUpload} />
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-blue-900/10">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          
          <div className="md:ml-[280px] transition-all duration-300">
            <Navbar onToggleSidebar={toggleSidebar} />
            
            <main className="min-h-[calc(100vh-60px)] p-6 animate-fadeIn">
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
