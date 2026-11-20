import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { FacebookAuthDto } from './dto/facebook-auth.dto';
import { Throttle } from '@nestjs/throttler';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register a new user and send email verification code/link',
  })
  @ApiResponse({
    status: 201,
    description: 'User created and verification email dispatched.',
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify user email with 6-digit code or verification token',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified and session tokens issued.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid, expired, or exhausted verification code/token.',
  })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification code via email or SMS',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification code re-dispatched if account is pending.',
  })
  resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerification(
      resendDto.email,
      resendDto.channel,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens successfully generated.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Email not verified.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens successfully refreshed.' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out.' })
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @Public()
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent (if email exists).',
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @Public()
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google OAuth 2.0' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated with Google and session tokens issued.',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired Google token.' })
  loginWithGoogle(@Body() dto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('facebook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Facebook OAuth 2.0' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated with Facebook and session tokens issued.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired Facebook credentials.',
  })
  loginWithFacebook(@Body() dto: FacebookAuthDto) {
    return this.authService.loginWithFacebook(dto);
  }

  @ApiBearerAuth()
  @Post('link/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link a Google account to the authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'Google account linked.' })
  @ApiResponse({
    status: 409,
    description: 'Google account already linked to another user.',
  })
  linkGoogle(@Req() req: AuthenticatedRequest, @Body() dto: GoogleAuthDto) {
    return this.authService.linkGoogle(req.user.userId, dto);
  }

  @ApiBearerAuth()
  @Post('link/facebook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link a Facebook account to the authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'Facebook account linked.' })
  @ApiResponse({
    status: 409,
    description: 'Facebook account already linked to another user.',
  })
  linkFacebook(@Req() req: AuthenticatedRequest, @Body() dto: FacebookAuthDto) {
    return this.authService.linkFacebook(req.user.userId, dto);
  }

  @ApiBearerAuth()
  @Delete('unlink/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'provider',
    enum: ['google', 'facebook'],
    description: 'Proveedor social a desvincular',
  })
  @ApiOperation({
    summary: 'Unlink Google or Facebook from the authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'Provider unlinked successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot unlink the only remaining authentication method.',
  })
  unlinkProvider(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: string,
  ) {
    return this.authService.unlinkProvider(req.user.userId, provider);
  }
}
