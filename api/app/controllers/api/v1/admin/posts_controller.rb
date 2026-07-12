class Api::V1::Admin::PostsController < ApplicationController
  before_action :set_post, only: [:show, :update, :destroy]

  ADMIN_FIELDS = [:id, :title, :url, :description, :published, :published_at, :updated_at].freeze

  def index
    posts = Post.order(created_at: :desc)
    render json: posts.as_json(only: ADMIN_FIELDS)
  end

  def show
    render json: @post.as_json(only: ADMIN_FIELDS)
  end

  def create
    post = current_user.posts.build(post_params)
    if post.save
      render json: post.as_json(only: ADMIN_FIELDS), status: :created
    else
      render json: { errors: post.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @post.update(post_params)
      render json: @post.as_json(only: ADMIN_FIELDS)
    else
      render json: { errors: @post.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @post.destroy
    head :no_content
  end

  private

  def set_post
    @post = Post.find(params[:id])
  end

  def post_params
    params.require(:post).permit(:title, :url, :description, :published)
  end
end