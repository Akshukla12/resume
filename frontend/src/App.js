import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, CssBaseline, Drawer, List, ListItem, ListItemIcon, ListItemText,
  IconButton, Box, useTheme, createTheme, ThemeProvider, Tooltip, Avatar, Button, TextField, Paper, CircularProgress
} from '@mui/material';
import { Menu as MenuIcon, History, Settings, LightMode, DarkMode, Description } from '@mui/icons-material';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf'; // <-- 1. Import jsPDF here
import './App.css';

const drawerWidth = 220;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [page, setPage] = useState('analyze');
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [resumeText, setResumeText] = useState('');

  // Theme setup
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#4f8cff' },
      background: { default: darkMode ? '#181c24' : '#f3f6fb' }
    },
    typography: {
      fontFamily: 'Inter, Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }
  });

  const navItems = [
    { text: 'Analyze', icon: <Description />, key: 'analyze' },
    { text: 'History', icon: <History />, key: 'history' },
    { text: 'Settings', icon: <Settings />, key: 'settings' }
  ];

  const logo = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <img src="/logo192.png" alt="Logo" style={{ width: 32, height: 32 }} />
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
        ResumeAI
      </Typography>
    </Box>
  );

  const topbar = (
    <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, background: darkMode ? '#23272f' : '#fff' }}>
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={() => setMobileOpen(!mobileOpen)}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        {logo}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
          <IconButton color="primary" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>
        <Avatar sx={{ ml: 2, bgcolor: 'primary.main' }}>A</Avatar>
      </Toolbar>
    </AppBar>
  );

  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Toolbar />
      <List>
        {navItems.map((item) => (
          <ListItem
            button
            key={item.key}
            selected={page === item.key}
            onClick={() => setPage(item.key)}
          >
            <ListItemIcon sx={{ color: 'primary.main' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  // --- Analyze form logic ---
  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    setResumeFile(file);
    setError('');
    setResumeText('');
    setResult(null);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');
    setResumeText('');

    if (!resumeFile) {
      setError('Please upload a resume file.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('jobDesc', jobDesc);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analyze`, {
  method: 'POST',
  body: formData,
});

      const data = await response.json();

      if (response.ok) {
        setResumeText(data.resumeText);
        setResult(data.result);
      } else {
        setError(data.error || 'Failed to analyze resume.');
      }
    } catch (err) {
      setError('Server error.');
    }

    setLoading(false);
  };

  // --- TXT Download ---
  const handleDownload = () => {
    if (!result) return;
    const content = `
Match Score: ${result.matchScore}
Feedback: ${result.feedback}
Suggestions:
${result.suggestions.map((s, i) => `- ${s}`).join('\n')}
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume_analysis.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- PDF Download (add this function) ---
  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Resume Analysis Report', 15, 20);

    doc.setFontSize(12);
    doc.text(`Match Score: ${result.matchScore}`, 15, 35);
    doc.text(`Feedback:`, 15, 45);
    doc.text(doc.splitTextToSize(result.feedback, 180), 25, 53);

    doc.text('Suggestions:', 15, 75);
    result.suggestions.forEach((s, i) => {
      doc.text(`- ${s}`, 20, 85 + i * 10);
    });

    doc.save('resume_analysis.pdf');
  };

  // --- Main content for each page ---
  const mainContent = (
    <motion.div
      key={page}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ padding: 0, minHeight: '80vh' }}
    >
      {page === 'analyze' && (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 700, margin: 'auto', mt: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
            Analyze Resume
          </Typography>
          <form onSubmit={handleAnalyze}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                component="label"
                sx={{ mr: 2, background: '#4f8cff' }}
              >
                Upload Resume
                <input type="file" accept=".pdf,.txt" hidden onChange={handleResumeUpload} />
              </Button>
              {resumeFile && <span style={{ fontSize: 15 }}>{resumeFile.name}</span>}
            </Box>
            <TextField
              label="Paste Job Description"
              multiline
              minRows={4}
              fullWidth
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !resumeFile || !jobDesc}
              sx={{ minWidth: 140, fontWeight: 600 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Analyze'}
            </Button>
          </form>
          <Box sx={{ mt: 3 }}>
            {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
            {result && !loading && !error && (
              <Typography color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                &#10003; Analysis complete!
              </Typography>
            )}
            {error && (
              <Typography color="error" sx={{ fontWeight: 600, mb: 1 }}>
                {error}
              </Typography>
            )}
            {resumeText && !loading && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, background: '#f8fafd' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Extracted Resume Text</Typography>
                <pre style={{ maxHeight: 120, overflow: 'auto', margin: 0, fontSize: 14 }}>{resumeText}</pre>
              </Paper>
            )}
            {result && !loading && (
              <Paper variant="outlined" sx={{ p: 2, background: '#f8fafd' }}>
                <Typography variant="h6" color="primary" sx={{ mb: 1 }}>Results</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  Match Score: <span style={{ color: '#4f8cff', fontSize: '1.3em' }}>{result.matchScore}</span>
                </Typography>
                <Typography sx={{ mt: 1, mb: 1 }}>
                  <strong>Feedback:</strong> {result.feedback}
                </Typography>
                <ul>
                  {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
                <Button
                  onClick={handleDownload}
                  variant="outlined"
                  sx={{ mt: 2, borderColor: '#4f8cff', color: '#4f8cff' }}
                >
                  Download TXT Report
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  variant="outlined"
                  sx={{ mt: 2, borderColor: '#4f8cff', color: '#4f8cff', ml: 2 }}
                >
                  Download PDF Report
                </Button>
              </Paper>
            )}
          </Box>
        </Paper>
      )}
      {page === 'history' && (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 700, margin: 'auto', mt: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
            Analysis History
          </Typography>
          <Typography color="text.secondary">
            (History feature coming soon!)
          </Typography>
        </Paper>
      )}
      {page === 'settings' && (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 700, margin: 'auto', mt: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
            Settings
          </Typography>
          <Typography color="text.secondary">
            (Settings feature coming soon!)
          </Typography>
        </Paper>
      )}
    </motion.div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {topbar}
      <Box sx={{ display: 'flex' }}>
        {/* Sidebar for desktop */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', background: darkMode ? '#23272f' : '#fff' }
          }}
          open
        >
          {drawer}
        </Drawer>
        {/* Sidebar for mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' }
          }}
        >
          {drawer}
        </Drawer>
        {/* Main content */}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 3 }, background: theme.palette.background.default, minHeight: '100vh' }}>
          <Toolbar />
          {mainContent}
        </Box>
      </Box>
      <footer style={{ textAlign: 'center', color: '#b3c7f7', fontSize: 15, margin: '20px 0 10px 0', letterSpacing: '0.5px' }}>
        &copy; {new Date().getFullYear()} Resume Analyzer. All rights reserved.
      </footer>
    </ThemeProvider>
  );
}

export default App;