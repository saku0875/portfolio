class AuthenticationController < ApplicationController
  skip_before_action :authenticate_request, only: [:login]

  def login
    user = User.find_by(email: params[:email])
    if user&.authenticate(params[:password])
      token = JsonWebToken.encode(user_id: user.id)
      render json: { token: token, name: user.name }, status: :ok
    else
      render json: { error: "メールアドレスまたはパスワードが正しくありません" }, status: :unauthorized
    end  # ← if に対応
  end    # ← def login に対応
  
  def me
    render json: { id: current_user.id, name: current_user.name, email: current_user.email }
  end    # ← def me に対応
end      # ← class に対応