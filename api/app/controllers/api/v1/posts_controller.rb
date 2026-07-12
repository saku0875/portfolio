class Api::V1::PostsController < ApplicationController
  skip_before_action :authenticate_request, only: [:index]

  def index
    posts = Post.published.order(published_at: :desc)
    render json: posts.as_json(only: [:id, :title, :url, :description, :published_at])
  end
end