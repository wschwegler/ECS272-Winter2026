import Bar_chart from './components/Bar_chart'
import HeatmapChart from './components/Heat_map';
import SankeyChart from './components/Sankey_chart';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey } from '@mui/material/colors';
import Typography from '@mui/material/Typography';


const theme = createTheme({
  palette: {
    primary:{
      main: grey[700],
    },
    secondary:{
      main: grey[700],
    }
  },
})

function Layout() {
  return (
    <Box id='main-container'>
      <Stack spacing={1} sx={{ height: '100%', paddingTop: 4, paddingX: 4}} justifyContent={'center'}>
        <Typography variant='h4' align='center' fontWeight={700}>
          Patterns in Genre Popularity, Ratings, and Film Adaptations
        </Typography>
        <Grid container spacing={2} sx={{ height: '40%' }}>
          <Grid size={6}>
            <Bar_chart />
          </Grid>  
          <Grid size={6}>
            <HeatmapChart />
            </Grid>        
        </Grid>
        <Grid container spacing={2} sx={{ height: '60%' }} justifyContent={'center'}>
          <Grid size={8}>
            <SankeyChart />
          </Grid> 
        </Grid>
      </Stack>
    </Box>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  )
}

export default App
