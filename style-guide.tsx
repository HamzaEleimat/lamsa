import React, { useState, useEffect } from 'react';

const LamsaStyleGuide: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Martel+Sans:wght@200;300;400;600;700;800;900&display=swap');
        
        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Martel Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8f8fc;
            margin: 0;
            padding: 40px;
            color: #181828;
            line-height: 1.5;
        }

        .style-guide-header {
            text-align: center;
            margin-bottom: 64px;
        }

        .style-guide-title {
            font-family: 'Cormorant Garamond', serif;
            font-size: 48px;
            font-weight: 400;
            margin: 0 0 8px 0;
            color: #4A3643;
        }

        .style-guide-subtitle {
            font-size: 16px;
            font-weight: 400;
            color: #9898a0;
            margin: 0;
        }

        .theme-toggle {
            display: flex;
            gap: 8px;
            margin-top: 24px;
        }

        .theme-btn {
            padding: 8px 16px;
            border: 2px solid #e8e8ed;
            background: white;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .theme-btn:hover {
            border-color: #CC8899;
        }

        .theme-btn-active {
            background: #4A3643;
            color: white;
            border-color: #4A3643;
        }

        /* Dark Mode Variables */
        :root {
            --bg-primary: #f8f8fc;
            --bg-secondary: white;
            --bg-tertiary: #f0f0f5;
            
            --text-primary: #181828;
            --text-secondary: #585870;
            --text-tertiary: #9898a0;
            --text-inverse: white;
            
            --border-primary: #e8e8ed;
            --border-secondary: #f0f0f5;
            
            --brand-primary: #4A3643;
            --brand-secondary: #CC8899;
            --brand-tertiary: #D4A5A5;
            --brand-light: #F5E6E6;
            
            --shadow-sm: 0 2px 4px rgba(0,0,0,0.08);
            --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
            --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
        }

        [data-theme="dark"] {
            --bg-primary: #0a0a0f;
            --bg-secondary: #181828;
            --bg-tertiary: #282838;
            
            --text-primary: #f8f8fc;
            --text-secondary: #b8b8bc;
            --text-tertiary: #7878a0;
            --text-inverse: #181828;
            
            --border-primary: #383850;
            --border-secondary: #282838;
            
            --brand-primary: #CC8899;
            --brand-secondary: #D4A5A5;
            --brand-tertiary: #E8C5C5;
            --brand-light: #4A3643;
            
            --shadow-sm: 0 2px 4px rgba(0,0,0,0.3);
            --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
            --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
        }

        body {
            background-color: var(--bg-primary);
            color: var(--text-primary);
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        .section {
            margin-bottom: 80px;
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 32px;
            font-family: 'Cormorant Garamond', serif;
            margin-bottom: 32px;
        }

        .section-label {
            color: var(--text-tertiary);
            font-weight: 300;
        }

        .section-arrow {
            color: var(--text-primary);
            font-weight: 300;
        }

        .section-name {
            color: var(--text-primary);
            font-weight: 400;
        }

        .component-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
        }

        .component-card {
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 32px;
            box-shadow: var(--shadow-md);
        }

        .component-title {
            font-family: 'Cormorant Garamond', serif;
            font-size: 24px;
            font-weight: 500;
            margin: 0 0 24px 0;
            color: var(--brand-primary);
        }

        .component-row {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            align-items: center;
            flex-wrap: wrap;
        }

        /* Color Swatches */
        .color-row {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .color-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            max-width: 180px;
        }

        .color-swatch {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            transition: transform 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }

        .color-swatch:hover {
            transform: scale(1.1);
        }

        /* Brand Colors */
        .brand-1 { background-color: #4A3643; }
        .brand-2 { background-color: #CC8899; }
        .brand-3 { background-color: #D4A5A5; }
        .brand-4 { background-color: #E8C5C5; }
        .brand-5 { background-color: #F5E6E6; }

        /* Base Colors */
        .base-1 { background-color: #e8e8ed; }
        .base-2 { background-color: #9898a0; }
        .base-3 { background-color: #585870; }
        .base-4 { background-color: #383850; }
        .base-5 { background-color: #181828; }
        .base-6 { background-color: #f0f0f5; }
        .base-7 { background-color: #f8f8fc; }

        /* System Colors */
        .orange-1 { background-color: #ffc880; }
        .orange-2 { background-color: #ff9c33; }
        .orange-3 { background-color: #ff8000; }
        .orange-4 { background-color: #e66300; }

        .blue-1 { background-color: #99ccff; }
        .blue-2 { background-color: #4da6ff; }
        .blue-3 { background-color: #0080ff; }
        .blue-4 { background-color: #0066cc; }

        .yellow-1 { background-color: #ffe680; }
        .yellow-2 { background-color: #ffdb33; }
        .yellow-3 { background-color: #ffd000; }
        .yellow-4 { background-color: #e6b800; }

        .green-1 { background-color: #80e6b3; }
        .green-2 { background-color: #33cc88; }
        .green-3 { background-color: #00b366; }
        .green-4 { background-color: #009955; }

        .red-1 { background-color: #ffb3ba; }
        .red-2 { background-color: #ff6680; }
        .red-3 { background-color: #ff3355; }
        .red-4 { background-color: #e60033; }

        /* Typography */
        .typography-showcase {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .type-example {
            display: flex;
            align-items: baseline;
            gap: 16px;
            padding: 16px;
            background: var(--bg-secondary);
            border-radius: 12px;
            box-shadow: var(--shadow-sm);
        }

        .type-label {
            font-size: 12px;
            color: var(--text-tertiary);
            min-width: 120px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .type-sample {
            flex: 1;
            margin: 0;
        }

        /* Typography Styles */
        .display-large {
            font-family: 'Cormorant Garamond', serif;
            font-size: 56px;
            font-weight: 300;
            line-height: 1.2;
            letter-spacing: -0.02em;
        }

        .display-medium {
            font-family: 'Cormorant Garamond', serif;
            font-size: 44px;
            font-weight: 400;
            line-height: 1.2;
        }

        .display-small {
            font-family: 'Cormorant Garamond', serif;
            font-size: 36px;
            font-weight: 400;
            line-height: 1.3;
        }

        .headline-large {
            font-family: 'Cormorant Garamond', serif;
            font-size: 32px;
            font-weight: 500;
            line-height: 1.3;
        }

        .headline-medium {
            font-family: 'Cormorant Garamond', serif;
            font-size: 28px;
            font-weight: 500;
            line-height: 1.3;
        }

        .headline-small {
            font-family: 'Cormorant Garamond', serif;
            font-size: 24px;
            font-weight: 500;
            line-height: 1.3;
        }

        .title-large {
            font-size: 20px;
            font-weight: 500;
            line-height: 1.4;
        }

        .title-medium {
            font-size: 16px;
            font-weight: 600;
            line-height: 1.5;
            letter-spacing: 0.01em;
        }

        .title-small {
            font-size: 14px;
            font-weight: 600;
            line-height: 1.5;
            letter-spacing: 0.01em;
        }

        .body-large {
            font-size: 16px;
            font-weight: 400;
            line-height: 1.6;
        }

        .body-medium {
            font-size: 14px;
            font-weight: 400;
            line-height: 1.6;
        }

        .body-small {
            font-size: 12px;
            font-weight: 400;
            line-height: 1.5;
        }

        .label-large {
            font-size: 14px;
            font-weight: 600;
            line-height: 1.4;
            letter-spacing: 0.02em;
        }

        .label-medium {
            font-size: 12px;
            font-weight: 600;
            line-height: 1.4;
            letter-spacing: 0.03em;
        }

        .label-small {
            font-size: 11px;
            font-weight: 600;
            line-height: 1.4;
            letter-spacing: 0.04em;
        }

        /* Buttons */
        .btn {
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 48px;
        }

        .btn-primary {
            background-color: var(--brand-primary);
            color: var(--bg-primary);
        }

        .btn-primary:hover {
            background-color: var(--brand-secondary);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(74, 54, 67, 0.3);
        }

        .btn-secondary {
            background-color: var(--brand-light);
            color: var(--brand-primary);
        }

        [data-theme="dark"] .btn-secondary {
            background-color: var(--bg-tertiary);
            color: var(--brand-secondary);
        }

        .btn-secondary:hover {
            background-color: #E8C5C5;
        }

        .btn-outline {
            background-color: transparent;
            color: var(--brand-primary);
            border: 2px solid var(--brand-primary);
        }

        .btn-outline:hover {
            background-color: var(--brand-primary);
            color: var(--bg-primary);
        }

        .btn-text {
            background-color: transparent;
            color: #CC8899;
            padding: 8px 16px;
        }

        .btn-text:hover {
            background-color: #F5E6E6;
        }

        .btn-small {
            padding: 12px 24px;
            font-size: 12px;
            min-height: 40px;
        }

        .btn-icon {
            width: 48px;
            height: 48px;
            padding: 0;
            border-radius: 50%;
            background-color: #F5E6E6;
            color: #4A3643;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-icon:hover {
            background-color: #E8C5C5;
            transform: scale(1.05);
        }

        .btn-icon svg {
            width: 24px;
            height: 24px;
        }

        /* Forms */
        .input-group {
            margin-bottom: 24px;
        }

        .input-label {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .input-field {
            width: 100%;
            padding: 16px;
            border: 2px solid var(--border-primary);
            border-radius: 12px;
            font-size: 14px;
            font-family: 'Martel Sans', sans-serif;
            transition: all 0.2s ease;
            background-color: var(--bg-secondary);
            color: var(--text-primary);
        }

        .input-field:focus {
            outline: none;
            border-color: var(--brand-secondary);
            box-shadow: 0 0 0 4px rgba(204, 136, 153, 0.2);
        }

        .input-field::placeholder {
            color: var(--text-tertiary);
        }

        /* OTP Box */
        .otp-box {
            width: 56px;
            height: 64px;
            text-align: center;
            font-size: 28px;
            font-weight: 700;
            border: 2px solid #e8e8ed;
            border-radius: 16px;
            transition: all 0.2s ease;
            background: white;
            color: var(--text-primary);
        }

        .otp-box:focus {
            outline: none;
            border-color: #CC8899;
            box-shadow: 0 0 0 4px rgba(204, 136, 153, 0.1);
        }

        /* Selection Cards */
        .selection-cards {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }

        .selection-card {
            padding: 24px;
            border: 2px solid #e8e8ed;
            border-radius: 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: white;
        }

        .selection-card:hover {
            border-color: #CC8899;
            transform: translateY(-2px);
        }

        .selection-card-active {
            border-color: #4A3643;
            background: #F5E6E6;
        }

        .selection-icon {
            font-size: 32px;
            margin-bottom: 12px;
            color: var(--brand-primary);
        }

        /* Badges */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 14px;
            border-radius: 16px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            position: relative;
            overflow: hidden;
        }

        .badge::before {
            content: '';
            position: absolute;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
        }

        .badge-success {
            background: linear-gradient(135deg, #e6f7f1 0%, #d4f4e8 100%);
            color: #009955;
            border: 1px solid rgba(0, 153, 85, 0.2);
            padding-left: 20px;
        }

        .badge-success::before {
            background: #00b366;
            box-shadow: 0 0 0 2px rgba(0, 179, 102, 0.3);
            animation: pulse-success 2s infinite;
        }

        .badge-warning {
            background: linear-gradient(135deg, #fff8e6 0%, #ffeed4 100%);
            color: #e66300;
            border: 1px solid rgba(230, 99, 0, 0.2);
            padding-left: 20px;
        }

        .badge-warning::before {
            background: #ff8000;
            box-shadow: 0 0 0 2px rgba(255, 128, 0, 0.3);
            animation: pulse-warning 2s infinite;
        }

        .badge-error {
            background: linear-gradient(135deg, #ffe6ea 0%, #ffd4db 100%);
            color: #e60033;
            border: 1px solid rgba(230, 0, 51, 0.2);
            padding-left: 20px;
        }

        .badge-error::before {
            background: #ff3355;
            box-shadow: 0 0 0 2px rgba(255, 51, 85, 0.3);
        }

        .badge-info {
            background: linear-gradient(135deg, #e6f2ff 0%, #d4e8ff 100%);
            color: #0066cc;
            border: 1px solid rgba(0, 102, 204, 0.2);
            padding-left: 20px;
        }

        .badge-info::before {
            background: #0080ff;
            box-shadow: 0 0 0 2px rgba(0, 128, 255, 0.3);
            animation: pulse-info 2s infinite;
        }

        @keyframes pulse-success {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        @keyframes pulse-warning {
            0%, 100% { transform: translateY(-50%) scale(1); }
            50% { transform: translateY(-50%) scale(1.2); }
        }

        @keyframes pulse-info {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        /* Chips */
        .chip {
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            background-color: var(--bg-tertiary);
            color: var(--text-secondary);
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .chip:hover {
            background-color: var(--border-primary);
        }

        .chip-active {
            background-color: var(--brand-primary);
            color: var(--bg-primary);
        }

        .chip-small {
            padding: 6px 12px;
            font-size: 11px;
        }

        /* Toggle Switch */
        .toggle-container {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .toggle {
            position: relative;
            width: 48px;
            height: 28px;
            background-color: #e8e8ed;
            border-radius: 14px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .toggle-active {
            background-color: #CC8899;
        }

        .toggle-knob {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 24px;
            height: 24px;
            background-color: white;
            border-radius: 50%;
            transition: transform 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .toggle-active .toggle-knob {
            transform: translateX(20px);
        }

        /* Avatar */
        .avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #CC8899 0%, #D4A5A5 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 18px;
        }

        .avatar-small {
            width: 32px;
            height: 32px;
            font-size: 14px;
        }

        .avatar-large {
            width: 64px;
            height: 64px;
            font-size: 24px;
        }

        /* Rating */
        .rating {
            display: flex;
            gap: 4px;
            align-items: center;
        }

        .star {
            color: #ffd000;
            font-size: 16px;
        }

        .star-empty {
            color: #e8e8ed;
        }

        .rating-text {
            margin-left: 8px;
            font-size: 14px;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .rating-compact {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .rating-compact svg {
            width: 12px;
            height: 12px;
        }

        /* Service Card */
        .service-card {
            background: var(--bg-secondary);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: var(--shadow-md);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .service-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }

        .service-image {
            width: 100%;
            height: 180px;
            background: linear-gradient(135deg, #F5E6E6 0%, #D4A5A5 100%);
            position: relative;
        }

        .service-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            color: #4A3643;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .service-content {
            padding: 20px;
        }

        .service-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: var(--text-primary);
        }

        .service-description {
            font-size: 14px;
            color: var(--text-secondary);
            margin: 0 0 16px 0;
            line-height: 1.5;
        }

        .service-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .service-price {
            font-size: 20px;
            font-weight: 700;
            color: var(--brand-primary);
        }

        .service-duration {
            font-size: 12px;
            color: var(--text-tertiary);
        }

        /* Provider Card */
        .provider-card {
            background: var(--bg-secondary);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: var(--shadow-md);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .provider-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }

        .provider-card-header {
            position: relative;
            height: 160px;
            overflow: hidden;
        }

        .provider-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .favorite-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: white;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }

        .favorite-btn:hover {
            transform: scale(1.1);
            background: #ffeef1;
        }

        .favorite-btn svg {
            width: 20px;
            height: 20px;
            stroke: #CC8899;
            transition: all 0.2s ease;
        }

        .provider-badges {
            position: absolute;
            bottom: 12px;
            left: 12px;
            display: flex;
            gap: 8px;
        }

        .provider-card-content {
            padding: 20px;
        }

        .provider-name {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 4px 0;
            color: var(--text-primary);
        }

        .provider-name-ar {
            font-size: 14px;
            color: var(--text-secondary);
            margin: 0 0 12px 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Arial', sans-serif;
            direction: rtl;
        }

        .provider-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .provider-distance {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--text-secondary);
        }

        .icon-small {
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .icon-small svg {
            width: 14px;
            height: 14px;
        }

        .provider-services {
            display: flex;
            gap: 6px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .service-tag {
            padding: 4px 10px;
            background: var(--bg-tertiary);
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .provider-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 16px;
            border-top: 1px solid var(--border-secondary);
        }

        .price-range {
            display: flex;
            flex-direction: column;
        }

        .price {
            font-size: 18px;
            font-weight: 700;
            color: var(--brand-primary);
        }

        /* Employee Card */
        .employee-card {
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            border: 2px solid transparent;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .employee-card:hover {
            border-color: var(--brand-secondary);
        }

        .employee-header {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }

        .employee-info {
            flex: 1;
        }

        .employee-info h4 {
            margin: 0 0 4px 0;
        }

        .employee-info p {
            margin: 0 0 8px 0;
            color: var(--text-secondary);
        }

        .employee-specialties {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        /* Tab Bar */
        .tab-bar {
            display: flex;
            justify-content: space-around;
            background: var(--bg-secondary);
            border-radius: 24px;
            padding: 8px;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
        }

        .tab-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 16px;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 64px;
        }

        .tab-item:hover {
            background: var(--bg-tertiary);
        }

        .tab-item-active {
            background: var(--brand-light);
        }

        [data-theme="dark"] .tab-item-active {
            background: var(--brand-primary);
        }

        .tab-icon {
            font-size: 24px;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .tab-icon svg {
            width: 24px;
            height: 24px;
        }

        .tab-item-active .tab-icon svg {
            stroke: var(--brand-primary);
            stroke-width: 2.5;
        }

        .tab-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-secondary);
        }

        .tab-item-active .tab-label {
            color: var(--brand-primary);
        }

        [data-theme="dark"] .tab-item-active .tab-label {
            color: var(--bg-primary);
        }

        /* Calendar & Date Picker */
        .calendar-widget {
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 20px;
            border: 1px solid var(--border-primary);
        }

        .calendar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .btn-icon-small {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: none;
            background: var(--bg-tertiary);
            color: var(--brand-primary);
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 18px;
        }

        .btn-icon-small:hover {
            background: var(--border-primary);
        }

        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }

        .calendar-day-header {
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-tertiary);
            padding: 8px;
        }

        .calendar-day {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .calendar-day:hover {
            background: var(--bg-tertiary);
        }

        .calendar-day-disabled {
            color: var(--border-primary);
            cursor: not-allowed;
        }

        .calendar-day-selected {
            background: var(--brand-primary);
            color: white;
        }

        .calendar-day-today {
            border: 2px solid var(--brand-secondary);
            font-weight: 600;
        }

        /* Time Slots */
        .time-slots-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }

        .time-slot {
            padding: 12px 16px;
            border: 2px solid var(--border-primary);
            border-radius: 12px;
            text-align: center;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            background: var(--bg-secondary);
        }

        .time-slot:hover {
            border-color: var(--brand-secondary);
        }

        .time-slot-selected {
            background: var(--brand-primary);
            color: white;
            border-color: var(--brand-primary);
        }

        .time-slot-unavailable {
            background: var(--bg-tertiary);
            color: var(--text-tertiary);
            cursor: not-allowed;
            border-color: var(--bg-tertiary);
        }

        /* Schedule Management */
        .schedule-grid {
            background: var(--bg-secondary);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid var(--border-primary);
        }

        .schedule-header {
            display: grid;
            grid-template-columns: 60px repeat(7, 1fr);
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--border-primary);
        }

        .schedule-time-col {
            padding: 12px;
            border-right: 1px solid var(--border-primary);
        }

        .schedule-day {
            padding: 12px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            border-right: 1px solid var(--border-primary);
        }

        .schedule-day:last-child {
            border-right: none;
        }

        .schedule-day-closed {
            background: var(--bg-tertiary);
            color: var(--text-tertiary);
        }

        .schedule-body {
            display: grid;
            grid-template-columns: 60px repeat(7, 1fr);
        }

        .schedule-time {
            padding: 20px 8px;
            font-size: 12px;
            color: var(--text-tertiary);
            font-weight: 500;
            border-right: 1px solid var(--border-primary);
            border-bottom: 1px solid var(--border-primary);
        }

        .schedule-slot {
            padding: 8px;
            border-right: 1px solid var(--border-primary);
            border-bottom: 1px solid var(--border-primary);
            min-height: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            transition: background 0.2s ease;
        }

        .schedule-slot:hover:not(.schedule-slot-blocked):not(.schedule-slot-booked) {
            background: var(--bg-tertiary);
            cursor: pointer;
        }

        .schedule-slot:nth-child(8n) {
            border-right: none;
        }

        .schedule-slot-booked {
            background: var(--brand-light);
            border-color: #E8C5C5;
        }

        [data-theme="dark"] .schedule-slot-booked {
            background: rgba(204, 136, 153, 0.2);
        }

        .slot-client {
            font-size: 12px;
            font-weight: 600;
            color: var(--brand-primary);
        }

        .slot-service {
            font-size: 11px;
            color: var(--brand-secondary);
        }

        .schedule-slot-break {
            background: #fff4e6;
        }

        .slot-break {
            font-size: 12px;
            color: #e66300;
            font-weight: 600;
        }

        .schedule-slot-blocked {
            background: var(--border-primary);
            cursor: not-allowed;
        }

        .schedule-legend {
            display: flex;
            gap: 24px;
            margin-top: 16px;
            justify-content: center;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--text-secondary);
        }

        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
        }

        /* Quick Actions */
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .quick-action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 20px;
            background: white;
            border: 2px solid #e8e8ed;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .quick-action-btn:hover {
            border-color: #CC8899;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        [data-theme="dark"] .quick-action-btn {
            background: var(--bg-secondary);
            border-color: var(--border-primary);
        }

        .quick-action-icon {
            font-size: 32px;
            color: var(--brand-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            background: var(--brand-light);
            border-radius: 12px;
            margin: 0 auto 8px;
        }

        .quick-action-icon svg {
            width: 28px;
            height: 28px;
        }

        [data-theme="dark"] .quick-action-icon {
            background: rgba(204, 136, 153, 0.1);
        }

        .quick-action-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            text-align: center;
        }

        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .stat-card {
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 20px;
            display: flex;
            gap: 16px;
            align-items: flex-start;
            box-shadow: var(--shadow-sm);
        }

        .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
        }

        .stat-content {
            flex: 1;
        }

        .stat-label {
            font-size: 12px;
            color: var(--text-tertiary);
            margin: 0 0 4px 0;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .stat-value {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: var(--text-primary);
        }

        .stat-trend {
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .stat-trend-up {
            color: #00b366;
        }

        .stat-trend-down {
            color: #e60033;
        }

        .stat-trend-neutral {
            color: var(--text-tertiary);
        }

        /* Bottom Sheet */
        .bottom-sheet {
            background: var(--bg-secondary);
            border-radius: 24px 24px 0 0;
            padding: 24px;
            box-shadow: 0 -8px 32px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
        }

        .sheet-handle {
            width: 48px;
            height: 4px;
            background: var(--border-primary);
            border-radius: 2px;
            margin: 0 auto 24px;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 48px 24px;
        }

        .empty-icon {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.5;
            color: var(--brand-primary);
        }

        .empty-icon svg {
            width: 64px;
            height: 64px;
        }

        .empty-state h4 {
            margin: 0 0 8px 0;
            color: var(--text-primary);
        }

        .empty-state p {
            margin: 0 0 24px 0;
            color: var(--text-tertiary);
            max-width: 240px;
            margin-left: auto;
            margin-right: auto;
        }

        /* Loading States */
        .skeleton-container {
            padding: 20px;
        }

        .skeleton {
            background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--border-primary) 50%, var(--bg-tertiary) 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 8px;
            margin-bottom: 12px;
        }

        .skeleton-text {
            height: 16px;
        }

        @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--bg-tertiary);
            border-top-color: var(--brand-secondary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Toast Notifications */
        .toast {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .toast-success {
            background: #e6f7f1;
            color: #009955;
        }

        .toast-error {
            background: #ffe6ea;
            color: #e60033;
        }

        [data-theme="dark"] .toast-success {
            background: rgba(0, 185, 102, 0.1);
            color: #00b366;
        }

        [data-theme="dark"] .toast-error {
            background: rgba(230, 0, 51, 0.1);
            color: #ff3355;
        }

        .toast-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
        }

        .toast-success .toast-icon {
            background: #00b366;
            color: white;
        }

        .toast-error .toast-icon {
            background: #e60033;
            color: white;
        }

        .toast-title {
            font-size: 14px;
            font-weight: 600;
            margin: 0 0 4px 0;
        }

        .toast-message {
            font-size: 12px;
            margin: 0;
            opacity: 0.8;
        }

        /* All additional styles for dark mode adjustments */
        [data-theme="dark"] .color-swatch {
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        [data-theme="dark"] .stat-card,
        [data-theme="dark"] .provider-card,
        [data-theme="dark"] .employee-card,
        [data-theme="dark"] .service-card,
        [data-theme="dark"] .calendar-widget,
        [data-theme="dark"] .time-slot,
        [data-theme="dark"] .selection-card,
        [data-theme="dark"] .otp-box {
            background: var(--bg-secondary);
            box-shadow: var(--shadow-md);
        }

        [data-theme="dark"] .selection-card-active {
            background: var(--bg-tertiary);
            border-color: var(--brand-primary);
        }

        [data-theme="dark"] .calendar-day-selected,
        [data-theme="dark"] .time-slot-selected {
            background: var(--brand-primary);
            color: var(--bg-primary);
        }

        [data-theme="dark"] .category-icon {
            background: rgba(204, 136, 153, 0.1);
        }

        /* Spacing utilities */
        .mt-4 { margin-top: 32px; }
        .mb-4 { margin-bottom: 32px; }
        .p-4 { padding: 32px; }
      `}</style>

      <div className="style-guide-header">
        <h1 className="style-guide-title">Lamsa Style Guide</h1>
        <p className="style-guide-subtitle">Design System for iOS & Android</p>
        <p className="style-guide-subtitle" style={{ marginTop: '8px', fontSize: '14px' }}>
          Cormorant Garamond + Martel Sans
        </p>
        <div className="theme-toggle">
          <button
            className={`theme-btn ${theme === 'light' ? 'theme-btn-active' : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            ☀️ Light
          </button>
          <button
            className={`theme-btn ${theme === 'dark' ? 'theme-btn-active' : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            🌙 Dark
          </button>
        </div>
      </div>

      {/* Color System */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Color</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Brand</span>
        </div>
        <div className="color-row">
          <div className="color-swatch brand-1"></div>
          <div className="color-swatch brand-2"></div>
          <div className="color-swatch brand-3"></div>
          <div className="color-swatch brand-4"></div>
          <div className="color-swatch brand-5"></div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-label">Color</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Base</span>
        </div>
        <div className="color-row">
          <div className="color-swatch base-1"></div>
          <div className="color-swatch base-2"></div>
          <div className="color-swatch base-3"></div>
          <div className="color-swatch base-4"></div>
          <div className="color-swatch base-5"></div>
        </div>
        <div className="color-row">
          <div className="color-swatch base-6" style={{ marginLeft: '96px' }}></div>
          <div className="color-swatch base-7"></div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-label">Color</span>
          <span className="section-arrow">→</span>
          <span className="section-name">System</span>
        </div>
        <div className="color-grid">
          <div className="color-swatch orange-1"></div>
          <div className="color-swatch orange-2"></div>
          <div className="color-swatch orange-3"></div>
          <div className="color-swatch orange-4"></div>
          
          <div className="color-swatch blue-1"></div>
          <div className="color-swatch blue-2"></div>
          <div className="color-swatch blue-3"></div>
          <div className="color-swatch blue-4"></div>
          
          <div className="color-swatch yellow-1"></div>
          <div className="color-swatch yellow-2"></div>
          <div className="color-swatch yellow-3"></div>
          <div className="color-swatch yellow-4"></div>
          
          <div className="color-swatch green-1"></div>
          <div className="color-swatch green-2"></div>
          <div className="color-swatch green-3"></div>
          <div className="color-swatch green-4"></div>
          
          <div className="color-swatch red-1"></div>
          <div className="color-swatch red-2"></div>
          <div className="color-swatch red-3"></div>
          <div className="color-swatch red-4"></div>
        </div>
      </div>

      {/* Typography */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Typography</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Scale</span>
        </div>
        <div className="component-card" style={{ marginBottom: '24px' }}>
          <h3 className="component-title">Font Families</h3>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              <p className="label-medium" style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                HEADINGS
              </p>
              <p className="headline-small" style={{ fontFamily: "'Cormorant Garamond', serif", margin: 0 }}>
                Cormorant Garamond
              </p>
            </div>
            <div>
              <p className="label-medium" style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                BODY TEXT
              </p>
              <p className="headline-small" style={{ fontFamily: "'Martel Sans', sans-serif", margin: 0 }}>
                Martel Sans
              </p>
            </div>
          </div>
        </div>
        <div className="typography-showcase">
          <div className="type-example">
            <span className="type-label">Display Large</span>
            <p className="type-sample display-large">Welcome to Lamsa</p>
          </div>
          <div className="type-example">
            <span className="type-label">Display Medium</span>
            <p className="type-sample display-medium">Book Your Perfect Look</p>
          </div>
          <div className="type-example">
            <span className="type-label">Display Small</span>
            <p className="type-sample display-small">Professional Stylists Near You</p>
          </div>
          <div className="type-example">
            <span className="type-label">Headline Large</span>
            <p className="type-sample headline-large">Choose Your Service</p>
          </div>
          <div className="type-example">
            <span className="type-label">Headline Medium</span>
            <p className="type-sample headline-medium">Available Appointments</p>
          </div>
          <div className="type-example">
            <span className="type-label">Headline Small</span>
            <p className="type-sample headline-small">Popular Services</p>
          </div>
          <div className="type-example">
            <span className="type-label">Title Large</span>
            <p className="type-sample title-large">Hair Styling</p>
          </div>
          <div className="type-example">
            <span className="type-label">Title Medium</span>
            <p className="type-sample title-medium">45 MIN SESSION</p>
          </div>
          <div className="type-example">
            <span className="type-label">Title Small</span>
            <p className="type-sample title-small">VIEW PROFILE</p>
          </div>
          <div className="type-example">
            <span className="type-label">Body Large</span>
            <p className="type-sample body-large">
              Experience luxury beauty services with our certified professionals.
            </p>
          </div>
          <div className="type-example">
            <span className="type-label">Body Medium</span>
            <p className="type-sample body-medium">
              Select your preferred date and time for the appointment.
            </p>
          </div>
          <div className="type-example">
            <span className="type-label">Body Small</span>
            <p className="type-sample body-small">
              Includes hair wash, styling, and finishing touches.
            </p>
          </div>
          <div className="type-example">
            <span className="type-label">Label Large</span>
            <p className="type-sample label-large">BOOK NOW</p>
          </div>
          <div className="type-example">
            <span className="type-label">Label Medium</span>
            <p className="type-sample label-medium">NEW CLIENT</p>
          </div>
          <div className="type-example">
            <span className="type-label">Label Small</span>
            <p className="type-sample label-small">5 SPOTS LEFT</p>
          </div>
        </div>
      </div>

      {/* Date & Time Selection */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Date & Time</span>
        </div>
        
        <div className="component-grid">
          {/* Calendar */}
          <div className="component-card">
            <h3 className="component-title">Date Picker</h3>
            <div className="calendar-widget">
              <div className="calendar-header">
                <button className="btn-icon-small">‹</button>
                <span className="title-medium">December 2024</span>
                <button className="btn-icon-small">›</button>
              </div>
              <div className="calendar-grid">
                <div className="calendar-day-header">S</div>
                <div className="calendar-day-header">M</div>
                <div className="calendar-day-header">T</div>
                <div className="calendar-day-header">W</div>
                <div className="calendar-day-header">T</div>
                <div className="calendar-day-header">F</div>
                <div className="calendar-day-header">S</div>
                
                <div className="calendar-day calendar-day-disabled">29</div>
                <div className="calendar-day calendar-day-disabled">30</div>
                <div className="calendar-day">1</div>
                <div className="calendar-day">2</div>
                <div className="calendar-day">3</div>
                <div className="calendar-day">4</div>
                <div className="calendar-day">5</div>
                <div className="calendar-day">6</div>
                <div className="calendar-day">7</div>
                <div className="calendar-day">8</div>
                <div className="calendar-day calendar-day-selected">9</div>
                <div className="calendar-day calendar-day-today">10</div>
                <div className="calendar-day">11</div>
                <div className="calendar-day">12</div>
              </div>
            </div>
          </div>

          {/* Time Slots */}
          <div className="component-card">
            <h3 className="component-title">Time Slot Selector</h3>
            <div className="time-slots-grid">
              <div className="time-slot time-slot-unavailable">9:00 AM</div>
              <div className="time-slot">9:30 AM</div>
              <div className="time-slot time-slot-selected">10:00 AM</div>
              <div className="time-slot">10:30 AM</div>
              <div className="time-slot">11:00 AM</div>
              <div className="time-slot">11:30 AM</div>
              <div className="time-slot">2:00 PM</div>
              <div className="time-slot">2:30 PM</div>
              <div className="time-slot">3:00 PM</div>
              <div className="time-slot time-slot-unavailable">3:30 PM</div>
              <div className="time-slot">4:00 PM</div>
              <div className="time-slot">4:30 PM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Provider Cards</span>
        </div>
        
        <div className="component-grid">
          {/* Provider Card */}
          <div className="provider-card">
            <div className="provider-card-header">
              <img 
                className="provider-image" 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23F5E6E6;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23CC8899;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='200' fill='url(%23grad1)' /%3E%3C/svg%3E" 
                alt="Salon"
              />
              <button className="favorite-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
              <div className="provider-badges">
                <span className="badge badge-info">VERIFIED</span>
                <span className="badge badge-success">OPEN NOW</span>
              </div>
            </div>
            <div className="provider-card-content">
              <h4 className="provider-name">Lamsa Beauty Center</h4>
              <p className="provider-name-ar">مركز لمسة للتجميل</p>
              <div className="provider-info">
                <div className="rating">
                  <span className="star">★</span>
                  <span className="star">★</span>
                  <span className="star">★</span>
                  <span className="star">★</span>
                  <span className="star star-empty">★</span>
                  <span className="rating-text">4.5 (234)</span>
                </div>
                <div className="provider-distance">
                  <span className="icon-small">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </span>
                  <span className="body-small">2.5 km</span>
                </div>
              </div>
              <div className="provider-services">
                <span className="service-tag">Hair</span>
                <span className="service-tag">Makeup</span>
                <span className="service-tag">Nails</span>
                <span className="service-tag">+3</span>
              </div>
              <div className="provider-footer">
                <div className="price-range">
                  <span className="body-small">Starting from</span>
                  <span className="price">15 JOD</span>
                </div>
                <button className="btn btn-primary btn-small">BOOK</button>
              </div>
            </div>
          </div>

          {/* Employee Card */}
          <div className="employee-card">
            <div className="employee-header">
              <div className="avatar avatar-large">SA</div>
              <div className="employee-info">
                <h4 className="title-medium">Sara Ahmad</h4>
                <p className="body-small">Senior Stylist • 5 years exp</p>
                <div className="rating-compact">
                  <span className="star">★</span>
                  <span className="rating-text">4.9 (89)</span>
                </div>
              </div>
            </div>
            <div className="employee-specialties">
              <span className="chip chip-small">Hair Color</span>
              <span className="chip chip-small">Bridal</span>
              <span className="chip chip-small">Keratin</span>
            </div>
            <button className="btn btn-outline btn-small" style={{ width: '100%', marginTop: '16px' }}>
              SELECT
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Components */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Navigation</span>
        </div>
        
        <div className="component-card">
          <h3 className="component-title">Bottom Tab Bar</h3>
          <div className="tab-bar">
            <div className="tab-item tab-item-active">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
              </div>
              <span className="tab-label">Home</span>
            </div>
            <div className="tab-item">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <span className="tab-label">Search</span>
            </div>
            <div className="tab-item">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span className="tab-label">Bookings</span>
            </div>
            <div className="tab-item">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <span className="tab-label">Favorites</span>
            </div>
            <div className="tab-item">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <span className="tab-label">Profile</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Management */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Provider</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Schedule Management</span>
        </div>
        
        <div className="component-grid">
          {/* Weekly Schedule Grid */}
          <div className="component-card" style={{ gridColumn: 'span 2' }}>
            <h3 className="component-title">Weekly Schedule</h3>
            <div className="schedule-grid">
              <div className="schedule-header">
                <div className="schedule-time-col"></div>
                <div className="schedule-day">Sun</div>
                <div className="schedule-day">Mon</div>
                <div className="schedule-day">Tue</div>
                <div className="schedule-day">Wed</div>
                <div className="schedule-day">Thu</div>
                <div className="schedule-day schedule-day-closed">Fri</div>
                <div className="schedule-day">Sat</div>
              </div>
              <div className="schedule-body">
                <div className="schedule-time">9:00</div>
                <div className="schedule-slot"></div>
                <div className="schedule-slot schedule-slot-booked">
                  <span className="slot-client">Sara A.</span>
                  <span className="slot-service">Hair Color</span>
                </div>
                <div className="schedule-slot"></div>
                <div className="schedule-slot"></div>
                <div className="schedule-slot schedule-slot-booked">
                  <span className="slot-client">Maha K.</span>
                  <span className="slot-service">Makeup</span>
                </div>
                <div className="schedule-slot schedule-slot-blocked"></div>
                <div className="schedule-slot"></div>
                
                <div className="schedule-time">10:00</div>
                <div className="schedule-slot schedule-slot-booked">
                  <span className="slot-client">Layla M.</span>
                  <span className="slot-service">Nails</span>
                </div>
                <div className="schedule-slot"></div>
                <div className="schedule-slot"></div>
                <div className="schedule-slot schedule-slot-break">
                  <span className="slot-break">Break</span>
                </div>
                <div className="schedule-slot"></div>
                <div className="schedule-slot schedule-slot-blocked"></div>
                <div className="schedule-slot"></div>
              </div>
            </div>
            <div className="schedule-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#CC8899' }}></div>
                <span>Booked</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#f0f0f5' }}></div>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#ffd000' }}></div>
                <span>Break</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#e8e8ed' }}></div>
                <span>Blocked</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="component-card">
            <h3 className="component-title">Schedule Quick Actions</h3>
            <div className="quick-actions">
              <button className="quick-action-btn">
                <span className="quick-action-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="18" r="1"/>
                    <circle cx="12" cy="6" r="1"/>
                  </svg>
                </span>
                <span className="quick-action-label">Ramadan Hours</span>
              </button>
              <button className="quick-action-btn">
                <span className="quick-action-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2l3 7h7l-5.5 4 2.5 7-7-5-7 5 2.5-7L2 9h7z"/>
                  </svg>
                </span>
                <span className="quick-action-label">Friday Prayer</span>
              </button>
              <button className="quick-action-btn">
                <span className="quick-action-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-6m0 0V9a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6m10 0H7m10 0a2 2 0 0 1 2 2v2m-12-4a2 2 0 0 0-2 2v2"/>
                    <circle cx="12" cy="4" r="2"/>
                  </svg>
                </span>
                <span className="quick-action-label">Vacation Mode</span>
              </button>
              <button className="quick-action-btn">
                <span className="quick-action-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="13 17 18 12 13 7"/>
                    <polyline points="6 17 11 12 6 7"/>
                  </svg>
                </span>
                <span className="quick-action-label">Quick Break</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Components */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Analytics</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Dashboard Stats</span>
        </div>
        
        <div className="component-grid">
          {/* Stats Cards */}
          <div className="component-card">
            <h3 className="component-title">Stats Cards</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#e6f2ff' }}>💰</div>
                <div className="stat-content">
                  <p className="stat-label">Monthly Revenue</p>
                  <h3 className="stat-value">2,450 JOD</h3>
                  <div className="stat-trend stat-trend-up">
                    <span>↑</span>
                    <span>12% vs last month</span>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#e6f7f1' }}>📅</div>
                <div className="stat-content">
                  <p className="stat-label">Total Bookings</p>
                  <h3 className="stat-value">156</h3>
                  <div className="stat-trend stat-trend-down">
                    <span>↓</span>
                    <span>5% vs last month</span>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fff4e6' }}>⭐</div>
                <div className="stat-content">
                  <p className="stat-label">Average Rating</p>
                  <h3 className="stat-value">4.8</h3>
                  <div className="stat-trend stat-trend-neutral">
                    <span>•</span>
                    <span>No change</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Flow Components */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Booking Flow</span>
        </div>
        
        <div className="component-grid">
          {/* Booking Summary */}
          <div className="component-card">
            <h3 className="component-title">Booking Summary</h3>
            <div className="booking-summary" style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="summary-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 className="title-medium">Booking Details</h4>
                <span className="badge badge-info">CONFIRMED</span>
              </div>
              <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span className="summary-label" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Service</span>
                <span className="summary-value" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'right' }}>Hair Styling & Color</span>
              </div>
              <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span className="summary-label" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Provider</span>
                <span className="summary-value" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'right' }}>Lamsa Beauty Center</span>
              </div>
              <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span className="summary-label" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Date & Time</span>
                <span className="summary-value" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'right' }}>Dec 15, 2024 • 10:00 AM</span>
              </div>
              <div className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span className="summary-label" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Duration</span>
                <span className="summary-value" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'right' }}>2 hours</span>
              </div>
              <div className="summary-divider" style={{ height: '1px', background: 'var(--border-primary)', margin: '16px 0' }}></div>
              <div className="summary-item summary-total" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span className="summary-label" style={{ fontSize: '16px', fontWeight: '600' }}>Total Amount</span>
                <span className="summary-value" style={{ fontSize: '16px', fontWeight: '600', color: 'var(--brand-primary)' }}>85 JOD</span>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>CONFIRM BOOKING</button>
            </div>
          </div>
        </div>
      </div>

      {/* States & Feedback */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">States & Feedback</span>
        </div>
        
        <div className="component-grid">
          {/* Empty States */}
          <div className="component-card">
            <h3 className="component-title">Empty States</h3>
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="12" y1="14" x2="12" y2="18"/>
                  <line x1="10" y1="16" x2="14" y2="16"/>
                </svg>
              </div>
              <h4 className="title-medium">No bookings yet</h4>
              <p className="body-small">Start exploring beauty services and book your first appointment</p>
              <button className="btn btn-primary btn-small">EXPLORE SERVICES</button>
            </div>
          </div>

          {/* Loading States */}
          <div className="component-card">
            <h3 className="component-title">Loading States</h3>
            <div className="skeleton-container">
              <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '45%' }}></div>
            </div>
            <div className="loading-spinner-container" style={{ textAlign: 'center', padding: '32px' }}>
              <div className="loading-spinner"></div>
              <p className="body-small" style={{ marginTop: '16px' }}>Loading services...</p>
            </div>
          </div>

          {/* Toasts & Alerts */}
          <div className="component-card">
            <h3 className="component-title">Notifications</h3>
            <div className="toast toast-success">
              <span className="toast-icon">✓</span>
              <div className="toast-content">
                <p className="toast-title">Booking Confirmed!</p>
                <p className="toast-message">Your appointment has been scheduled</p>
              </div>
            </div>
            <div className="toast toast-error">
              <span className="toast-icon">!</span>
              <div className="toast-content">
                <p className="toast-title">Time slot unavailable</p>
                <p className="toast-message">Please select another time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal & Sheets */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Modals & Sheets</span>
        </div>
        
        <div className="component-card">
          <h3 className="component-title">Bottom Sheet Example</h3>
          <div className="bottom-sheet">
            <div className="sheet-handle"></div>
            <h4 className="title-large">Filter Services</h4>
            <div className="filter-section" style={{ marginBottom: '32px' }}>
              <label className="label-medium">Price Range</label>
              <div className="price-slider" style={{ padding: '0 8px' }}>
                <div className="slider-track" style={{ height: '4px', background: 'var(--border-primary)', borderRadius: '2px', position: 'relative', marginBottom: '16px' }}>
                  <div className="slider-fill" style={{ width: '60%', height: '100%', background: 'var(--brand-secondary)', borderRadius: '2px' }}></div>
                  <div className="slider-thumb" style={{ width: '20px', height: '20px', background: 'var(--brand-primary)', borderRadius: '50%', position: 'absolute', top: '50%', left: '60%', transform: 'translate(-50%, -50%)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}></div>
                </div>
                <div className="slider-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  <span>0 JOD</span>
                  <span>200 JOD</span>
                </div>
              </div>
            </div>
            <div className="filter-section" style={{ marginBottom: '32px' }}>
              <label className="label-medium">Categories</label>
              <div className="filter-chips" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="chip chip-active">All</span>
                <span className="chip">Hair</span>
                <span className="chip">Makeup</span>
                <span className="chip">Nails</span>
                <span className="chip">Spa</span>
              </div>
            </div>
            <div className="sheet-actions" style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}>RESET</button>
              <button className="btn btn-primary" style={{ flex: 1 }}>APPLY FILTERS</button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional UI Elements */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Additional Elements</span>
        </div>
        
        <div className="component-grid">
          {/* Toggle Switch */}
          <div className="component-card">
            <h3 className="component-title">Toggle & Settings</h3>
            <div className="toggle-container">
              <span className="label-medium">Email Notifications</span>
              <div className="toggle toggle-active">
                <div className="toggle-knob"></div>
              </div>
            </div>
            <div className="toggle-container" style={{ marginTop: '16px' }}>
              <span className="label-medium">SMS Alerts</span>
              <div className="toggle">
                <div className="toggle-knob"></div>
              </div>
            </div>
            <div className="toggle-container" style={{ marginTop: '16px' }}>
              <span className="label-medium">Biometric Login</span>
              <div className="toggle toggle-active">
                <div className="toggle-knob"></div>
              </div>
            </div>
          </div>

          {/* Avatars & Ratings */}
          <div className="component-card">
            <h3 className="component-title">Ratings & Avatars</h3>
            <div className="component-row">
              <div className="rating">
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star star-empty">★</span>
                <span className="rating-text">4.0 (127)</span>
              </div>
            </div>
            <div className="component-row">
              <div className="avatar avatar-small">JS</div>
              <div className="avatar">AM</div>
              <div className="avatar avatar-large">SD</div>
            </div>
          </div>

          {/* Service Cards */}
          <div className="component-card">
            <h3 className="component-title">Service Card</h3>
            <div className="service-card">
              <div className="service-image">
                <span className="service-badge">POPULAR</span>
              </div>
              <div className="service-content">
                <h4 className="service-title">Classic Hair Styling</h4>
                <p className="service-description">Professional hair wash, cut, and styling with premium products</p>
                <div className="rating">
                  <span className="star">★</span>
                  <span className="star">★</span>
                  <span className="star">★</span>
                  <span className="star">★</span>
                  <span className="star">★</span>
                  <span className="rating-text">5.0 (89)</span>
                </div>
                <div className="service-footer">
                  <div>
                    <div className="service-price">$85</div>
                    <div className="service-duration">60 min</div>
                  </div>
                  <button className="btn btn-primary btn-small">BOOK</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">UI Elements</span>
        </div>
        
        <div className="component-grid">
          {/* Buttons */}
          <div className="component-card">
            <h3 className="component-title">Buttons</h3>
            <div className="component-row">
              <button className="btn btn-primary">BOOK NOW</button>
              <button className="btn btn-secondary">VIEW MORE</button>
            </div>
            <div className="component-row">
              <button className="btn btn-outline">FILTER</button>
              <button className="btn btn-text">Cancel</button>
            </div>
            <div className="component-row">
              <button className="btn btn-primary btn-small">CONFIRM</button>
              <button className="btn btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Form Elements */}
          <div className="component-card">
            <h3 className="component-title">Form Elements</h3>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input type="text" className="input-field" placeholder="Enter your name" />
            </div>
            <div className="input-group">
              <label className="input-label">Search Services</label>
              <div className="search-bar" style={{ position: 'relative' }}>
                <span className="icon icon-search search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9898a0' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </span>
                <input type="text" className="input-field search-input" placeholder="Search for services..." style={{ paddingLeft: '48px' }} />
              </div>
            </div>
          </div>

          {/* Chips & Tags */}
          <div className="component-card">
            <h3 className="component-title">Chips & Tags</h3>
            <div className="component-row">
              <span className="chip chip-active">Hair Styling</span>
              <span className="chip">Makeup</span>
              <span className="chip">Nails</span>
              <span className="chip">Spa</span>
            </div>
            <div className="component-row">
              <span className="badge badge-success">Available</span>
              <span className="badge badge-warning">Few Spots</span>
              <span className="badge badge-error">Booked</span>
              <span className="badge badge-info">New</span>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Components */}
      <div className="section">
        <div className="section-header">
          <span className="section-label">Components</span>
          <span className="section-arrow">→</span>
          <span className="section-name">Authentication</span>
        </div>
        
        <div className="component-grid">
          {/* Phone Input */}
          <div className="component-card">
            <h3 className="component-title">Phone Input</h3>
            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="input-field" style={{ width: '80px', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                  +962
                </div>
                <input type="tel" className="input-field" placeholder="7X XXX XXXX" style={{ flex: 1 }} />
              </div>
            </div>
          </div>

          {/* OTP Input */}
          <div className="component-card">
            <h3 className="component-title">OTP Verification</h3>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <input type="text" className="otp-box" maxLength={1} defaultValue="5" />
              <input type="text" className="otp-box" maxLength={1} defaultValue="3" />
              <input type="text" className="otp-box" maxLength={1} />
              <input type="text" className="otp-box" maxLength={1} />
            </div>
            <p className="body-small" style={{ textAlign: 'center', marginTop: '16px', color: '#9898a0' }}>
              Resend code in 0:45
            </p>
          </div>

          {/* User Type Selection */}
          <div className="component-card">
            <h3 className="component-title">User Type Selection</h3>
            <div className="selection-cards">
              <div className="selection-card selection-card-active">
                <div className="selection-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {/* Female Figure - Customer */}
                    <path d="M12 15c4 0 6 2 6 5v1H6v-1c0-3 2-5 6-5z"/>
                    <circle cx="12" cy="7" r="4"/>
                    <path d="M15 7c0-1.5.5-2.5 1.5-3"/>
                    <path d="M9 7c0-1.5-.5-2.5-1.5-3"/>
                    <path d="M12 11v4"/>
                  </svg>
                </div>
                <h4 className="title-medium">Customer</h4>
                <p className="body-small">Book beauty services</p>
              </div>
              <div className="selection-card">
                <div className="selection-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {/* Makeup Palette - Provider */}
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8" cy="8" r="2"/>
                    <circle cx="16" cy="8" r="2"/>
                    <circle cx="8" cy="16" r="2"/>
                    <circle cx="16" cy="16" r="2"/>
                    <circle cx="12" cy="12" r="1"/>
                  </svg>
                </div>
                <h4 className="title-medium">Provider</h4>
                <p className="body-small">Manage your salon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LamsaStyleGuide;