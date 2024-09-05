import type { FC } from 'react';
import { Box, IconButton, styled, Tooltip, Typography } from '@mui/material';
import { SectionHeader } from './SharedComponents';
import useUiConfig from 'hooks/api/getters/useUiConfig/useUiConfig';
import type { Sdk } from './sharedTypes';
import {
    checkFlagCodeSnippets,
    initializeCodeSnippets,
    installCommands,
} from './sdkSnippets';
import copy from 'copy-to-clipboard';
import useToast from 'hooks/useToast';
import CopyIcon from '@mui/icons-material/FileCopy';

const SpacedContainer = styled('div')(({ theme }) => ({
    padding: theme.spacing(5, 8, 8, 8),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
}));

const StyledCodeBlock = styled('pre')(({ theme }) => ({
    backgroundColor: theme.palette.background.elevation1,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    overflow: 'auto',
    fontSize: theme.typography.body2.fontSize,
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
    position: 'relative',
}));

const CopyToClipboard = styled(Tooltip)(({ theme }) => ({
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
}));

const CopyBlock: FC<{ title: string; code: string }> = ({ title, code }) => {
    const onCopyToClipboard = (data: string) => () => {
        copy(data);
        setToastData({
            type: 'success',
            title: 'Copied to clipboard',
        });
    };
    const { setToastData } = useToast();

    return (
        <StyledCodeBlock>
            {code}
            <CopyToClipboard title={title} arrow>
                <IconButton onClick={onCopyToClipboard(code)} size='small'>
                    <CopyIcon />
                </IconButton>
            </CopyToClipboard>
        </StyledCodeBlock>
    );
};

interface ITestSdkConnectionProps {
    sdk: Sdk;
    apiKey: string;
    feature: string;
}
export const TestSdkConnection: FC<ITestSdkConnectionProps> = ({
    sdk,
    apiKey,
    feature,
}) => {
    const { uiConfig } = useUiConfig();

    const clientApiUrl = `${uiConfig.unleashUrl}/api/`;
    const frontendApiUrl = `${uiConfig.unleashUrl}/api/frontend/`;
    const apiUrl = sdk.type === 'client' ? clientApiUrl : frontendApiUrl;
    const initializeCodeSnippet =
        initializeCodeSnippets[sdk.name] ||
        `No snippet found for the ${sdk.name} SDK`;
    const installCommand =
        installCommands[sdk.name] ||
        `No install command found for the ${sdk.name} SDK`;
    const filledInitializeCodeSnippet = initializeCodeSnippet
        .replace('<YOUR_API_TOKEN>', apiKey)
        .replace('<YOUR_API_URL>', apiUrl);
    const checkFlagCodeSnippet =
        checkFlagCodeSnippets[sdk.name] ||
        `No snippet found for the ${sdk.name} SDK`;
    const filledCheckFlagCodeSnippet = checkFlagCodeSnippet.replace(
        '<YOUR_FLAG>',
        feature,
    );

    return (
        <SpacedContainer>
            <Typography variant='h2'>Connect an SDK to Unleash</Typography>
            <Box sx={{ mt: 4 }}>
                <SectionHeader>Setup the SDK</SectionHeader>
                <p>1. Install the SDK</p>
                <CopyBlock title='Copy command' code={installCommand} />
                <p>2. Initialize the SDK</p>
                <CopyBlock
                    title='Copy snippet'
                    code={filledInitializeCodeSnippet}
                />
                <p>3. Check feature status</p>
                <CopyBlock
                    title='Copy snippet'
                    code={filledCheckFlagCodeSnippet}
                />
            </Box>
        </SpacedContainer>
    );
};