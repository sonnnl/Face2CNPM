import React from "react";
import { Outlet } from "react-router-dom";
import { Box, Container } from "@mui/material";

/**
 * Layout tối giản cho các trang như đăng nhập, đăng ký
 */
const MinimalLayout = () => {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: (theme) => theme.palette.background.default,
      }}
    >
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default MinimalLayout;
